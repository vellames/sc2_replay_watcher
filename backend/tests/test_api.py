from fastapi.testclient import TestClient

from app import main
from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


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

    response = client.post(
        "/api/replays/parse",
        files={"file": ("match.SC2Replay", b"replay contents")},
    )

    assert response.status_code == 200
    assert response.json() == {"filename": "match.SC2Replay"}
    assert calls and calls[0][0] is fake_parse


def test_demo_is_compiled_by_world_engine() -> None:
    response = client.get("/api/replays/demo")
    assert response.status_code == 200
    payload = response.json()

    assert payload["meta"]["positionModel"] == "world-engine"
    assert payload["meta"]["worldSchemaVersion"] == "1.9"
    assert any(frame["bases"] for frame in payload["frames"])
    assert any(frame["armyGroups"] for frame in payload["frames"])
    assert "engagements" in payload
    assert payload["engagements"]
    assert {
        "mineralLosses",
        "vespeneLosses",
        "supplyLost",
        "tradeEfficiency",
    }.issubset(payload["engagements"][0])
    assert sum(len(samples) for samples in payload["cameraSamples"].values()) > 0
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
