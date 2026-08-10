from types import SimpleNamespace

from app.n3_features import COMMAND_CLASSES, STAT_ATTRIBUTES, _State, _command_class


def command(name: str | None, *, has_ability: bool = True) -> SimpleNamespace:
    return SimpleNamespace(has_ability=has_ability, ability_name=name)


def test_command_taxonomy_covers_race_specific_production_and_technology() -> None:
    assert _command_class(command("TrainMarine")) == "production"
    assert _command_class(command("WarpInStalker")) == "production"
    assert _command_class(command("MorphHydralisk")) == "production"
    assert _command_class(command("MorphToLurker")) == "morph_transform"
    assert _command_class(command("UpgradeToHive")) == "morph_transform"
    assert _command_class(command("UpgradeGroundWeapons1")) == "technology"
    assert _command_class(command("EvolveMetabolicBoost")) == "technology"
    assert _command_class(command(None, has_ability=False)) == "no_explicit_ability"


def test_snapshot_populates_the_complete_numeric_feature_families() -> None:
    state = _State((1, 2))
    stats = {field: 0.0 for field in STAT_ATTRIBUTES}
    state.stats = {1: (100, stats), 2: (100, stats)}

    row = state.snapshot(
        100,
        {
            "self_race": "Terr",
            "enemy_race": "Zerg",
            "matchup": "TvZ",
            "map": "Test LE",
            "patch": "5.0.16",
        },
    )

    assert row is not None
    assert len([key for key in row if key.startswith("aggregate_")]) == 119
    assert len([key for key in row if key.startswith("flow_")]) == 54
    assert len([key for key in row if key.startswith("behavior_")]) == 9
    assert len([key for key in row if key.startswith("command_semantic_")]) == 252
    assert all(
        f"command_semantic_self__{semantic}__count__60s" in row
        for semantic in COMMAND_CLASSES
    )
