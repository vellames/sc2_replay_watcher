from __future__ import annotations

import os
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .world_adapter import parse_replay

MAX_REPLAY_SIZE = 50 * 1024 * 1024
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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


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
async def upload_replay(file: Annotated[UploadFile, File()]) -> dict:
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

    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".SC2Replay", delete=False
        ) as temporary:
            temporary.write(content)
            temp_path = Path(temporary.name)
        return await run_in_threadpool(parse_replay, temp_path, filename=filename)
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
