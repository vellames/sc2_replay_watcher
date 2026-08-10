from __future__ import annotations

import os
import tempfile
from datetime import datetime, timezone
from collections import OrderedDict
from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from threading import Lock
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sc2_world_engine import __version__ as engine_version
from sc2_world_engine.errors import UnsupportedMatchFormatError
from sc2_world_engine.archive import SCHEMA_VERSION

from .world_adapter import parse_replay
from .replay_chat import (
    OPENROUTER_MODEL,
    ReplayChatRequest,
    ask_replay_model,
    replay_chat_configured,
    replay_chat_model_name,
)
from .win_probability import (
    CADENCE_SECONDS,
    WinProbabilityUnavailable,
    build_win_probability_series,
)

MAX_REPLAY_SIZE = 50 * 1024 * 1024
UPLOAD_CACHE_SIZE = 2
UPLOAD_LOG_PATH = Path(
    os.getenv(
        "REPLAY_UPLOAD_LOG_PATH",
        Path(__file__).resolve().parents[1] / "data" / "replay_uploads.txt",
    )
)
UPLOAD_LOG_SALT = os.getenv("REPLAY_UPLOAD_LOG_SALT", "sc2-replay-watcher")
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
_upload_log_lock = Lock()
_win_probability_cache: OrderedDict[str, dict] = OrderedDict()
_win_probability_cache_lock = Lock()


def _cached_upload(digest: str, filename: str) -> dict | None:
    with _upload_cache_lock:
        payload = _upload_cache.get(digest)
        if payload is None:
            return None
        _upload_cache.move_to_end(digest)
        return {**payload, "meta": {**payload["meta"], "filename": filename}}


def _public_replay(payload: dict) -> dict:
    """Keep model-only feature frames in the server cache, never in the browser payload."""
    return {key: value for key, value in payload.items() if not key.startswith("_n3")}


def _remember_upload(digest: str, payload: dict) -> None:
    with _upload_cache_lock:
        _upload_cache[digest] = payload
        _upload_cache.move_to_end(digest)
        while len(_upload_cache) > UPLOAD_CACHE_SIZE:
            _upload_cache.popitem(last=False)


def _anonymous_visitor_id(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").split(",", 1)[0].strip()
    address = forwarded or (request.client.host if request.client else "unknown")
    return sha256(f"{UPLOAD_LOG_SALT}|{address}".encode()).hexdigest()[:16]


def _record_upload(
    request: Request,
    *,
    filename: str,
    size: int,
    digest: str | None,
    result: str,
) -> None:
    """Append one upload attempt without retaining the visitor's raw address."""
    clean_filename = filename.replace("\t", " ").replace("\r", " ").replace("\n", " ")
    fields = (
        datetime.now(timezone.utc).isoformat(timespec="seconds"),
        _anonymous_visitor_id(request),
        clean_filename,
        str(size),
        digest or "-",
        result,
    )
    try:
        with _upload_log_lock:
            UPLOAD_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            needs_header = not UPLOAD_LOG_PATH.exists() or UPLOAD_LOG_PATH.stat().st_size == 0
            with UPLOAD_LOG_PATH.open("a", encoding="utf-8") as log:
                if needs_header:
                    log.write("timestamp_utc\tvisitor_id\tfilename\tsize_bytes\treplay_sha256\tresult\n")
                log.write("\t".join(fields) + "\n")
    except OSError:
        # Telemetry must never prevent the user from parsing a replay.
        return


def _replay_for_analysis(analysis_id: str) -> dict | None:
    if analysis_id == "demo":
        return _demo_replay()
    with _upload_cache_lock:
        return _upload_cache.get(analysis_id)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engineVersion": engine_version, "schemaVersion": SCHEMA_VERSION}


@app.get("/api/chat/config")
def replay_chat_config() -> dict:
    return {
        "enabled": replay_chat_configured(),
        "model": OPENROUTER_MODEL,
        "modelName": replay_chat_model_name(),
        "sponsor": "CBSC2",
        "alpha": True,
    }


@lru_cache(maxsize=1)
def _demo_replay() -> dict:
    if not DEMO_REPLAY_PATH.exists():
        raise FileNotFoundError("Demo replay fixture is missing")

    payload = parse_replay(
        DEMO_REPLAY_PATH,
        filename="HSC XXIX · Serral vs Clem · Grand Final G4",
    )
    payload["meta"]["analysisId"] = "demo"
    return payload


@app.get("/api/replays/demo")
def demo_replay() -> dict:
    try:
        return _public_replay(_demo_replay())
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail="The demo replay is unavailable."
        ) from exc


@app.post("/api/replays/parse")
async def upload_replay(
    request: Request, response: Response, file: Annotated[UploadFile, File()]
) -> dict:
    filename = file.filename or "replay.SC2Replay"
    if not filename.lower().endswith(".sc2replay"):
        _record_upload(
            request, filename=filename, size=0, digest=None, result="rejected_extension"
        )
        raise HTTPException(
            status_code=415, detail="Upload a valid .SC2Replay file."
        )

    content = await file.read(MAX_REPLAY_SIZE + 1)
    if len(content) > MAX_REPLAY_SIZE:
        _record_upload(
            request,
            filename=filename,
            size=len(content),
            digest=None,
            result="rejected_size",
        )
        raise HTTPException(
            status_code=413, detail="The replay exceeds the 50 MB limit."
        )

    digest = sha256(content).hexdigest()
    cached = _cached_upload(digest, filename)
    if cached is not None:
        _record_upload(
            request,
            filename=filename,
            size=len(content),
            digest=digest,
            result="cache_hit",
        )
        response.headers["X-Replay-Cache"] = "HIT"
        return _public_replay(cached)

    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".SC2Replay", delete=False
        ) as temporary:
            temporary.write(content)
            temp_path = Path(temporary.name)
        payload = await run_in_threadpool(parse_replay, temp_path, filename=filename)
        if isinstance(payload.get("meta"), dict):
            payload["meta"]["analysisId"] = digest
        _remember_upload(digest, payload)
        _record_upload(
            request,
            filename=filename,
            size=len(content),
            digest=digest,
            result="processed",
        )
        response.headers["X-Replay-Cache"] = "MISS"
        return _public_replay(payload)
    except HTTPException:
        raise
    except UnsupportedMatchFormatError as exc:
        _record_upload(
            request,
            filename=filename,
            size=len(content),
            digest=digest,
            result="rejected_format",
        )
        raise HTTPException(
            status_code=422,
            detail="Only 1v1 replays are currently supported.",
        ) from exc
    except Exception as exc:
        _record_upload(
            request,
            filename=filename,
            size=len(content),
            digest=digest,
            result="parse_error",
        )
        raise HTTPException(
            status_code=422,
            detail="The replay could not be parsed. It may be corrupted or use an unsupported version.",
        ) from exc
    finally:
        if temp_path:
            temp_path.unlink(missing_ok=True)


@app.get("/api/replays/{analysis_id}/win-probability")
async def replay_win_probability(analysis_id: str) -> dict:
    with _win_probability_cache_lock:
        cached = _win_probability_cache.get(analysis_id)
        if cached is not None:
            _win_probability_cache.move_to_end(analysis_id)
            return cached
    replay = _replay_for_analysis(analysis_id)
    if replay is None:
        raise HTTPException(status_code=404, detail="The replay is no longer cached.")
    try:
        result = await run_in_threadpool(
            build_win_probability_series, replay, analysis_id
        )
    except WinProbabilityUnavailable:
        return {
            "status": "unavailable",
            "cadenceSeconds": CADENCE_SECONDS,
            "experimental": True,
            "points": [],
        }
    with _win_probability_cache_lock:
        _win_probability_cache[analysis_id] = result
        _win_probability_cache.move_to_end(analysis_id)
        while len(_win_probability_cache) > UPLOAD_CACHE_SIZE + 1:
            _win_probability_cache.popitem(last=False)
    return result


@app.post("/api/replays/{analysis_id}/chat")
async def replay_chat(analysis_id: str, request: ReplayChatRequest) -> dict:
    replay = _replay_for_analysis(analysis_id)
    if replay is None:
        raise HTTPException(status_code=404, detail="The replay is no longer cached.")
    if not replay_chat_configured():
        raise HTTPException(
            status_code=503,
            detail="Replay chat is not configured. Set OPENROUTER_API_KEY.",
        )
    probability = await replay_win_probability(analysis_id)
    return await ask_replay_model(replay, request, probability)
