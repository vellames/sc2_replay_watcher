import pytest

from app import win_probability


SCHEMA = {
    "model": "fixture-model",
    "required_features": [
        "time_seconds",
        "self_race",
        "enemy_race",
        "matchup",
        "map",
        "patch",
        "aggregate_self__scoreValueMineralsCurrent",
        "aggregate_enemy__scoreValueMineralsCurrent",
        "aggregate_diff__scoreValueMineralsCurrent",
        "command_semantic_self__production__count__60s",
        "entity_self_complete_json",
        "entity_self_in_progress_json",
        "entity_self_upgrades_json",
        "entity_enemy_complete_json",
        "entity_enemy_in_progress_json",
        "entity_enemy_upgrades_json",
    ],
    "numeric_features": [
        "time_seconds",
        "aggregate_self__scoreValueMineralsCurrent",
        "aggregate_enemy__scoreValueMineralsCurrent",
        "aggregate_diff__scoreValueMineralsCurrent",
        "command_semantic_self__production__count__60s",
    ],
}


def replay_fixture(duration: int = 2) -> dict:
    return {
        "meta": {"duration": duration, "map": "Test LE", "gameVersion": "5.0.15"},
        "players": [
            {"id": 1, "name": "One", "race": "Terran"},
            {"id": 2, "name": "Two", "race": "Zerg"},
        ],
        "buildOrder": [
            {"playerId": 1, "product": "Stimpack", "kind": "upgrade", "completedAt": 1},
        ],
        "frames": [
            {
                "time": 0,
                "stats": {"1": {"minerals": 50}, "2": {"minerals": 75}},
                "units": [
                    {"ownerId": 1, "type": "SCV", "category": "worker", "completed": True},
                    {"ownerId": 2, "type": "Zergling", "category": "unit", "completed": False},
                ],
            },
            {
                "time": 2,
                "stats": {"1": {"minerals": 100}, "2": {"minerals": 80}},
                "units": [],
            },
        ],
    }


def test_snapshots_hold_world_state_and_preserve_missing_values() -> None:
    snapshots = list(win_probability.iter_snapshots(replay_fixture(), SCHEMA))

    assert [time for time, _ in snapshots] == [
        0,
        0.25,
        0.5,
        0.75,
        1,
        1.25,
        1.5,
        1.75,
        2,
    ]
    first = snapshots[0][1]
    assert first["self_race"] == "Terr"
    assert first["enemy_race"] == "Zerg"
    assert first["matchup"] == "TvZ"
    assert first["aggregate_diff__scoreValueMineralsCurrent"] == -25
    assert first["command_semantic_self__production__count__60s"] is None
    assert first["entity_self_complete_json"] == {"SCV": 1}
    assert first["entity_enemy_in_progress_json"] == {"Zergling": 1}
    assert snapshots[3][1]["entity_self_upgrades_json"] == {}
    assert snapshots[4][1]["entity_self_upgrades_json"] == {"Stimpack": 1}
    assert snapshots[8][1]["aggregate_self__scoreValueMineralsCurrent"] == 100


def test_series_batches_predictions_and_returns_both_players(monkeypatch) -> None:
    calls: list[dict] = []
    monkeypatch.setattr(win_probability, "inference_schema", lambda: SCHEMA)

    def fake_request(path: str, payload: dict | None = None) -> dict:
        assert path == "/v1/predict"
        assert payload is not None
        calls.append(payload)
        return {
            "model": "fixture-model",
            "predictions": [
                {"index": index, "win_probability": 0.4 + index * 0.02}
                for index, _ in enumerate(payload["snapshots"])
            ],
        }

    monkeypatch.setattr(win_probability, "_request_json", fake_request)
    result = win_probability.build_win_probability_series(replay_fixture(), "fixture")

    assert len(calls) == 1
    assert result["status"] == "ready"
    assert result["cadenceSeconds"] == 0.25
    assert result["points"][0] == {"time": 0.0, "playerOne": 0.4, "playerTwo": 0.6}
    assert result["points"][2]["time"] == 0.5
    assert result["points"][2]["playerOne"] == pytest.approx(0.44)
