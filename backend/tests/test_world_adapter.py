from sc2_world_engine import (
    Confidence,
    EntityState,
    WorldArchiveReader,
    WorldArchiveWriter,
)
from sc2_world_engine.models import PlayerState, WorldDocument, WorldFrame

from app.world_adapter import watcher_payload


def test_world_archive_is_adapted_to_watcher_contract(tmp_path) -> None:
    document = WorldDocument(
        source={
            "filename": "fixture.SC2Replay",
            "sha256": "abc",
            "release": "5.0.16.97425",
            "baseBuild": 97425,
            "expansion": "LotV",
        },
        match={
            "map": "Test LE",
            "duration": 2.0,
            "playedAt": None,
            "winner": "One",
            "players": [{"id": 1, "name": "One", "race": "Terran", "result": "Win"}],
        },
        map_bounds={"minX": 0, "maxX": 100, "minY": 0, "maxY": 100},
        frames=[
            WorldFrame(
                0,
                [
                    EntityState(
                        1,
                        "SCV",
                        1,
                        10,
                        20,
                        "worker",
                        moving=True,
                        position_confidence=Confidence.DERIVED,
                    )
                ],
                {1: PlayerState(minerals=50)},
            ),
            WorldFrame(2, []),
        ],
        diagnostics={
            "trackedEvents": 4,
            "movementOrders": 2,
            "estimatedPositionRatio": 0.25,
        },
    )
    archive = tmp_path / "fixture.sc2world"
    WorldArchiveWriter().write(document, archive)

    payload = watcher_payload(
        WorldArchiveReader(archive), filename="Uploaded.SC2Replay"
    )

    assert payload["meta"]["filename"] == "Uploaded.SC2Replay"
    assert payload["meta"]["positionModel"] == "world-engine"
    assert payload["meta"]["cameraModel"] == "recorded-sample-hold"
    assert payload["mapVisual"] == {
        "source": "procedural",
        "dataUrl": None,
        "width": None,
        "height": None,
        "mapWidth": None,
        "mapHeight": None,
    }
    assert payload["mapGeometry"] == {
        "source": "procedural",
        "width": None,
        "height": None,
        "gridWidth": None,
        "gridHeight": None,
        "cliffRle": [],
        "walkableRle": [],
        "buildableRle": [],
        "clearanceRle": [],
        "ramps": [],
        "staticObjects": [],
    }
    assert payload["cameraSamples"] == {}
    assert payload["players"][0]["color"] == "#48a9ff"
    assert payload["frames"][0]["units"][0]["positionSource"] == "derived"
    assert payload["frames"][0]["stats"]["1"]["minerals"] == 50
    assert payload["frames"][0]["production"] == {}
    assert payload["frames"][0]["cameras"] == {}
