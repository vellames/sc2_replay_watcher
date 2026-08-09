from __future__ import annotations

import os
import tempfile
from collections import OrderedDict
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from threading import Lock
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sc2_world_engine import __version__ as engine_version
from sc2_world_engine.archive import SCHEMA_VERSION

from .world_adapter import parse_replay

MAX_REPLAY_SIZE = 50 * 1024 * 1024
UPLOAD_CACHE_SIZE = 2
DEMO_REPLAY_PATH = (
    Path(__file__).resolve().parents[2]
    / "samples"
    / "HSC-XXIX-Grand-Final-G4-2026.SC2Replay"
)

app = FastAPI(
    title="SC2 Replay Watcher API",
    description="Transforms StarCraft II replay files into lightweight 2D snapshots.",
    version="0.1.0",
)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

_upload_cache: OrderedDict[str, dict] = OrderedDict()
_upload_cache_lock = Lock()


def _cached_upload(digest: str, filename: str) -> dict | None:
    with _upload_cache_lock:
        payload = _upload_cache.get(digest)
        if payload is None:
            return None
        _upload_cache.move_to_end(digest)
        return {**payload, "meta": {**payload["meta"], "filename": filename}}


def _remember_upload(digest: str, payload: dict) -> None:
    with _upload_cache_lock:
        _upload_cache[digest] = payload
        _upload_cache.move_to_end(digest)
        while len(_upload_cache) > UPLOAD_CACHE_SIZE:
            _upload_cache.popitem(last=False)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engineVersion": engine_version, "schemaVersion": SCHEMA_VERSION}


@lru_cache(maxsize=1)
def _demo_replay() -> dict:
    if not DEMO_REPLAY_PATH.exists():
        raise FileNotFoundError("Demo replay fixture is missing")

    return parse_replay(
        DEMO_REPLAY_PATH,
        filename="HSC XXIX · Serral vs Clem · Grand Final G4",
    )


@app.get("/api/replays/demo")
def demo_replay() -> dict:
    try:
        return _demo_replay()
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail="O replay de demonstração não está disponível."
        ) from exc


@app.post("/api/replays/parse")
async def upload_replay(response: Response, file: Annotated[UploadFile, File()]) -> dict:
    filename = file.filename or "replay.SC2Replay"
    if not filename.lower().endswith(".sc2replay"):
        raise HTTPException(
            status_code=415, detail="Envie um arquivo .SC2Replay válido."
        )

    content = await file.read(MAX_REPLAY_SIZE + 1)
    if len(content) > MAX_REPLAY_SIZE:
        raise HTTPException(
            status_code=413, detail="O replay excede o limite de 50 MB."
        )

    digest = sha256(content).hexdigest()
    cached = _cached_upload(digest, filename)
    if cached is not None:
        response.headers["X-Replay-Cache"] = "HIT"
        return cached

    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".SC2Replay", delete=False
        ) as temporary:
            temporary.write(content)
            temp_path = Path(temporary.name)
        payload = await run_in_threadpool(parse_replay, temp_path, filename=filename)
        _remember_upload(digest, payload)
        response.headers["X-Replay-Cache"] = "MISS"
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="Não foi possível interpretar este replay. Ele pode estar corrompido ou usar uma versão ainda não suportada.",
        ) from exc
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)
