import pytest
from fastapi.testclient import TestClient
from sc2_world_engine.errors import UnsupportedMatchFormatError

from app import main
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolate_upload_log(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(main, "UPLOAD_LOG_PATH", tmp_path / "replay_uploads.txt")


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["engineVersion"]
    assert response.json()["schemaVersion"] == "1.11"


def test_rejects_wrong_extension() -> None:
    response = client.post(
        "/api/replays/parse", files={"file": ("notes.txt", b"not a replay")}
    )
    assert response.status_code == 415


def test_rejects_invalid_replay() -> None:
    response = client.post(
        "/api/replays/parse",
        files={"file": ("broken.SC2Replay", b"not a replay")},
    )
    assert response.status_code == 422


def test_upload_compilation_runs_outside_the_event_loop(monkeypatch) -> None:
    calls: list[tuple[object, tuple, dict]] = []

    def fake_parse(path, *, filename):
        assert path.exists()
        return {"filename": filename}

    async def fake_threadpool(function, *args, **kwargs):
        calls.append((function, args, kwargs))
        return function(*args, **kwargs)

    monkeypatch.setattr(main, "parse_replay", fake_parse)
    monkeypatch.setattr(main, "run_in_threadpool", fake_threadpool)
    main._upload_cache.clear()

    response = client.post(
        "/api/replays/parse",
        files={"file": ("match.SC2Replay", b"replay contents")},
    )

    assert response.status_code == 200
    assert response.json() == {"filename": "match.SC2Replay"}
    assert calls and calls[0][0] is fake_parse


def test_rejects_non_1v1_with_clear_message(monkeypatch) -> None:
    def fake_parse(_path, *, filename):
        raise UnsupportedMatchFormatError(f"Unsupported match: {filename}")

    monkeypatch.setattr(main, "parse_replay", fake_parse)
    main._upload_cache.clear()

    response = client.post(
        "/api/replays/parse",
        files={"file": ("team-game.SC2Replay", b"valid team replay")},
    )

    assert response.status_code == 422
    assert response.json() == {
        "detail": "Apenas replays 1v1 são suportados no momento."
    }


def test_repeated_upload_reuses_compiled_payload(monkeypatch) -> None:
    compiled = 0

    def fake_parse(path, *, filename):
        nonlocal compiled
        compiled += 1
        return {"meta": {"filename": filename}, "frames": []}

    monkeypatch.setattr(main, "parse_replay", fake_parse)
    main._upload_cache.clear()

    first = client.post(
        "/api/replays/parse",
        files={"file": ("first.SC2Replay", b"same valid replay")},
    )
    second = client.post(
        "/api/replays/parse",
        files={"file": ("renamed.SC2Replay", b"same valid replay")},
    )

    assert first.status_code == second.status_code == 200
    assert compiled == 1
    assert first.headers["X-Replay-Cache"] == "MISS"
    assert second.headers["X-Replay-Cache"] == "HIT"
    assert second.json()["meta"]["filename"] == "renamed.SC2Replay"


def test_uploads_are_recorded_without_raw_ip(monkeypatch, tmp_path) -> None:
    upload_log = tmp_path / "replay_uploads.txt"

    def fake_parse(_path, *, filename):
        return {"meta": {"filename": filename}, "frames": []}

    monkeypatch.setattr(main, "UPLOAD_LOG_PATH", upload_log)
    monkeypatch.setattr(main, "parse_replay", fake_parse)
    main._upload_cache.clear()

    headers = {"x-forwarded-for": "203.0.113.42"}
    first = client.post(
        "/api/replays/parse",
        files={"file": ("first.SC2Replay", b"tracked replay")},
        headers=headers,
    )
    second = client.post(
        "/api/replays/parse",
        files={"file": ("renamed.SC2Replay", b"tracked replay")},
        headers=headers,
    )

    assert first.status_code == second.status_code == 200
    lines = upload_log.read_text(encoding="utf-8").splitlines()
    assert lines[0] == (
        "timestamp_utc\tvisitor_id\tfilename\tsize_bytes\treplay_sha256\tresult"
    )
    assert len(lines) == 3
    assert lines[1].endswith("\tprocessed")
    assert lines[2].endswith("\tcache_hit")
    assert "203.0.113.42" not in upload_log.read_text(encoding="utf-8")
    assert lines[1].split("\t")[1] == lines[2].split("\t")[1]


def test_upload_log_failure_does_not_break_parsing(monkeypatch, tmp_path) -> None:
    def fake_parse(_path, *, filename):
        return {"meta": {"filename": filename}, "frames": []}

    monkeypatch.setattr(main, "UPLOAD_LOG_PATH", tmp_path)
    monkeypatch.setattr(main, "parse_replay", fake_parse)
    main._upload_cache.clear()

    response = client.post(
        "/api/replays/parse",
        files={"file": ("match.SC2Replay", b"valid replay")},
    )

    assert response.status_code == 200


def test_win_probability_is_computed_outside_event_loop(monkeypatch) -> None:
    replay = {"meta": {"filename": "fixture.SC2Replay"}, "frames": []}
    main._upload_cache["fixture"] = replay
    main._win_probability_cache.clear()
    calls: list[tuple[object, tuple, dict]] = []

    def fake_build(payload, request_id):
        assert payload is replay
        assert request_id == "fixture"
        return {"status": "ready", "cadenceSeconds": 0.25, "points": []}

    async def fake_threadpool(function, *args, **kwargs):
        calls.append((function, args, kwargs))
        return function(*args, **kwargs)

    monkeypatch.setattr(main, "build_win_probability_series", fake_build)
    monkeypatch.setattr(main, "run_in_threadpool", fake_threadpool)

    response = client.get("/api/replays/fixture/win-probability")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert calls and calls[0][0] is fake_build


def test_missing_probability_service_does_not_break_replay(monkeypatch) -> None:
    main._upload_cache["unavailable"] = {
        "meta": {"filename": "fixture.SC2Replay"},
        "frames": [],
    }
    main._win_probability_cache.clear()

    def unavailable(_payload, _request_id):
        raise main.WinProbabilityUnavailable("offline")

    monkeypatch.setattr(main, "build_win_probability_series", unavailable)
    response = client.get("/api/replays/unavailable/win-probability")

    assert response.status_code == 200
    assert response.json() == {
        "status": "unavailable",
        "cadenceSeconds": 0.25,
        "experimental": True,
        "points": [],
    }


def test_demo_is_compiled_by_world_engine() -> None:
    response = client.get("/api/replays/demo")
    assert response.status_code == 200
    payload = response.json()

    assert payload["meta"]["positionModel"] == "world-engine"
    assert payload["meta"]["worldSchemaVersion"] == "1.11"
    assert any(frame["bases"] for frame in payload["frames"])
    assert any(frame["armyGroups"] for frame in payload["frames"])
    assert {
        "statsRecordedAt",
        "committedArmySupply",
        "fieldedWorkers",
        "fieldedArmySupply",
        "fieldedArmyValue",
    }.issubset(payload["frames"][0]["stats"]["1"])
    assert "engagements" in payload
    assert payload["engagements"]
    assert payload["buildOrder"]
    assert {"playerId", "product", "kind", "startedAt", "completedAt", "confidence"}.issubset(
        payload["buildOrder"][0]
    )
    assert {
        "mineralLosses",
        "vespeneLosses",
        "supplyLost",
        "tradeEfficiency",
        "initialComposition",
        "finalComposition",
        "lossesByType",
        "initialValue",
        "finalValue",
        "initialSupply",
        "finalSupply",
        "actions",
    }.issubset(payload["engagements"][0])
    assert sum(len(samples) for samples in payload["cameraSamples"].values()) > 0
    assert payload["cameraAnalytics"]
    assert {"jumpsPerMinute", "averageDwellSeconds"}.issubset(
        next(iter(payload["cameraAnalytics"].values()))
    )
    assert payload["mapVisual"]["source"] in {"official", "procedural"}
    if payload["mapVisual"]["source"] == "official":
        assert payload["mapVisual"]["dataUrl"].startswith("data:image/webp;base64,")
    if payload["mapGeometry"]["source"] == "s2ma":
        assert sum(payload["mapGeometry"]["cliffRle"][1::2]) == (
            payload["mapGeometry"]["gridWidth"] * payload["mapGeometry"]["gridHeight"]
        )
    assert payload["meta"]["engineVersion"]
    assert payload["meta"]["winner"] == "Serral"
    assert payload["frames"][0]["time"] == 0
    assert payload["frames"][-1]["time"] == payload["meta"]["duration"]
    assert any(
        unit["isMoving"] for frame in payload["frames"] for unit in frame["units"]
    )
    assert any(frame["production"] for frame in payload["frames"])
    assert payload["meta"]["capabilities"] == {
        "unitEconomy": True,
        "liveVitals": False,
        "playerCameras": True,
        "mapNavigation": True,
        "semanticBases": True,
        "stableArmyGroups": True,
        "engagements": True,
        "analyticTimeline": True,
    }
    assert payload["meta"]["navigationSource"] == "s2ma-grid"
    assert payload["meta"]["routedSegments"] > 0
    assert any(
        unit["mineralCost"] > 0
        for frame in payload["frames"]
        for unit in frame["units"]
    )
    assert payload["meta"]["cameraEvents"] > 1000
    assert all(set(frame["cameras"]).issubset({"1", "2"}) for frame in payload["frames"])
    assert any(frame["cameras"] for frame in payload["frames"])
    assert any(
        unit["attachmentId"] is not None
        for frame in payload["frames"]
        for unit in frame["units"]
    )
