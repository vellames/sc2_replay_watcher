from types import SimpleNamespace

from app.n3_features import (
    COMMAND_CLASSES,
    STAT_ATTRIBUTES,
    _State,
    _canonical_entity,
    _command_class,
    _is_cosmetic_command,
    _is_cosmetic_entity,
    _is_cosmetic_upgrade,
)


def command(name: str | None, *, has_ability: bool = True) -> SimpleNamespace:
    return SimpleNamespace(has_ability=has_ability, ability_name=name)


def event(event_type: str, **attributes: object) -> object:
    instance = type(event_type, (), {})()
    for name, value in attributes.items():
        setattr(instance, name, value)
    return instance


def test_command_taxonomy_covers_race_specific_production_and_technology() -> None:
    assert _command_class(command("TrainMarine")) == "production"
    assert _command_class(command("WarpInStalker")) == "production"
    assert _command_class(command("MorphHydralisk")) == "production"
    assert _command_class(command("MorphToLurker")) == "morph_transform"
    assert _command_class(command("UpgradeToHive")) == "morph_transform"
    assert _command_class(command("UpgradeGroundWeapons1")) == "technology"
    assert _command_class(command("EvolveMetabolicBoost")) == "technology"
    assert _command_class(command(None, has_ability=False)) == "no_explicit_ability"


def test_cosmetic_signals_are_excluded_from_inference_features() -> None:
    assert _is_cosmetic_entity("BeaconArmy")
    assert not _is_cosmetic_entity("Marine")
    assert _is_cosmetic_upgrade("RewardDanceGhost", 100)
    assert _is_cosmetic_upgrade("AnyAccountLoadout", 0)
    assert not _is_cosmetic_upgrade("Stimpack", 100)
    assert _is_cosmetic_command(command("SprayTerran"))
    assert _is_cosmetic_command(command("Dance"))
    assert not _is_cosmetic_command(command("CausticSpray"))
    assert not _is_cosmetic_command(command("Attack"))


def test_supply_depot_modes_share_one_inference_entity() -> None:
    assert _canonical_entity("SupplyDepot") == "SupplyDepot"
    assert _canonical_entity("SupplyDepotLowered") == "SupplyDepot"
    assert _canonical_entity("SupplyDepotRaised") == "SupplyDepot"


def test_state_does_not_count_cosmetic_tracker_or_command_events() -> None:
    state = _State((1, 2))
    player = SimpleNamespace(pid=1)

    state.tracker(
        event(
            "UnitBornEvent",
            frame=0,
            unit_id=10,
            unit_type_name="BeaconArmy",
            unit_controller=player,
        )
    )
    state.tracker(
        event(
            "UnitBornEvent",
            frame=20,
            unit_id=20,
            unit_type_name="SupplyDepotLowered",
            unit_controller=player,
        )
    )
    state.tracker(
        event(
            "UnitTypeChangeEvent",
            frame=30,
            unit_id=20,
            unit_type_name="SupplyDepotRaised",
        )
    )
    state.tracker(
        event(
            "UpgradeCompleteEvent",
            frame=0,
            player=player,
            upgrade_type_name="RewardDanceGhost",
        )
    )
    state.game(
        event(
            "TargetPointCommandEvent",
            frame=10,
            player=player,
            has_ability=True,
            ability_name="SprayTerran",
        )
    )

    assert state.units[20].unit_type == "SupplyDepot"
    assert state.upgrades[1] == {}
    assert state.flow[1]["born"] == [20]
    assert state.flow[1]["upgrade"] == []
    assert state.commands[1]["special_ability"] == []
    assert state.commands[1]["__total__"] == []


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
