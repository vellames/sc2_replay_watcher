from __future__ import annotations

import bisect
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import sc2reader


LOOPS_PER_SECOND = 22.4
WINDOWS = (("60s", round(60 * LOOPS_PER_SECOND)), ("240s", round(240 * LOOPS_PER_SECOND)))
FLOW_NAMES = ("born", "init", "done", "lost", "killed", "upgrade")
COMMAND_CLASSES = (
    "no_explicit_ability",
    "production",
    "construction",
    "technology",
    "rally_control",
    "cancel",
    "race_macro",
    "morph_transform",
    "transport",
    "tactical_control",
    "special_ability",
    "unknown",
)
EXCLUDED_ENTITY_PREFIXES = ("beacon",)
EXCLUDED_ENTITY_NAMES = frozenset(
    {
        "broodlingescort",
        "invisibletargetdummy",
        "parasiticbombdummy",
        "parasiticbombrelaydummy",
        "releaseinterceptorsbeacon",
    }
)
COSMETIC_UPGRADE_PREFIXES = (
    "gameheart",
    "ghostalternate",
    "rewarddance",
    "spray",
)
EXCLUDED_COMMAND_NAMES = frozenset(
    {
        "gather",
        "lowersupplydepot",
        "raisesupplydepot",
        "returncargo",
    }
)
EXCLUDED_COMMAND_PREFIXES = (
    "dance",
    "emote",
    "sprayprotoss",
    "sprayterran",
    "sprayzerg",
    "taunt",
)
ENTITY_ALIASES = {
    "SupplyDepotLowered": "SupplyDepot",
    "SupplyDepotRaised": "SupplyDepot",
}

# Names in the frozen N3 contract mapped to sc2reader's PlayerStatsEvent API.
STAT_ATTRIBUTES = {
    "scoreValueFoodMade": "food_made",
    "scoreValueFoodUsed": "food_used",
    "scoreValueMineralsCollectionRate": "minerals_collection_rate",
    "scoreValueMineralsCurrent": "minerals_current",
    "scoreValueMineralsFriendlyFireArmy": "ff_minerals_lost_army",
    "scoreValueMineralsFriendlyFireEconomy": "ff_minerals_lost_economy",
    "scoreValueMineralsFriendlyFireTechnology": "ff_minerals_lost_technology",
    "scoreValueMineralsKilledArmy": "minerals_killed_army",
    "scoreValueMineralsKilledEconomy": "minerals_killed_economy",
    "scoreValueMineralsKilledTechnology": "minerals_killed_technology",
    "scoreValueMineralsLostArmy": "minerals_lost_army",
    "scoreValueMineralsLostEconomy": "minerals_lost_economy",
    "scoreValueMineralsLostTechnology": "minerals_lost_technology",
    "scoreValueMineralsUsedActiveForces": "minerals_used_active_forces",
    "scoreValueMineralsUsedCurrentArmy": "minerals_used_current_army",
    "scoreValueMineralsUsedCurrentEconomy": "minerals_used_current_economy",
    "scoreValueMineralsUsedCurrentTechnology": "minerals_used_current_technology",
    "scoreValueMineralsUsedInProgressArmy": "minerals_used_in_progress_army",
    "scoreValueMineralsUsedInProgressEconomy": "minerals_used_in_progress_economy",
    "scoreValueMineralsUsedInProgressTechnology": "minerals_used_in_progress_technology",
    "scoreValueVespeneCollectionRate": "vespene_collection_rate",
    "scoreValueVespeneCurrent": "vespene_current",
    "scoreValueVespeneFriendlyFireArmy": "ff_vespene_lost_army",
    "scoreValueVespeneFriendlyFireEconomy": "ff_vespene_lost_economy",
    "scoreValueVespeneFriendlyFireTechnology": "ff_vespene_lost_technology",
    "scoreValueVespeneKilledArmy": "vespene_killed_army",
    "scoreValueVespeneKilledEconomy": "vespene_killed_economy",
    "scoreValueVespeneKilledTechnology": "vespene_killed_technology",
    "scoreValueVespeneLostArmy": "vespene_lost_army",
    "scoreValueVespeneLostEconomy": "vespene_lost_economy",
    "scoreValueVespeneLostTechnology": "vespene_lost_technology",
    "scoreValueVespeneUsedActiveForces": "vespene_used_active_forces",
    "scoreValueVespeneUsedCurrentArmy": "vespene_used_current_army",
    "scoreValueVespeneUsedCurrentEconomy": "vespene_used_current_economy",
    "scoreValueVespeneUsedCurrentTechnology": "vespene_used_current_technology",
    "scoreValueVespeneUsedInProgressArmy": "vespene_used_in_progress_army",
    "scoreValueVespeneUsedInProgressEconomy": "vespene_used_in_progress_economy",
    "scoreValueVespeneUsedInProgressTechnology": "vespene_used_in_progress_technology",
    "scoreValueWorkersActiveCount": "workers_active_count",
}


def _race(value: str) -> str:
    lowered = value.lower()
    if lowered.startswith("prot"):
        return "Prot"
    if lowered.startswith("terr"):
        return "Terr"
    if lowered.startswith("zerg"):
        return "Zerg"
    return value


def _owner_id(event: Any) -> int:
    player = getattr(event, "unit_upkeeper", None) or getattr(event, "unit_controller", None)
    if player is not None and getattr(player, "pid", None):
        return int(player.pid)
    unit = getattr(event, "unit", None)
    owner = getattr(unit, "owner", None)
    if owner is not None and getattr(owner, "pid", None):
        return int(owner.pid)
    return int(getattr(event, "upkeep_pid", 0) or getattr(event, "control_pid", 0) or 0)


def _player_id(event: Any) -> int:
    player = getattr(event, "player", None)
    return int(getattr(player, "pid", 0) or 0)


def _command_class(event: Any) -> str:
    if not bool(getattr(event, "has_ability", False)):
        return "no_explicit_ability"
    name = str(getattr(event, "ability_name", "") or "").lower().replace(" ", "")
    if not name:
        return "unknown"
    if (
        name.startswith("train")
        or name.startswith("warpin")
        or (name.startswith("morph") and not name.startswith("morphto"))
    ):
        return "production"
    if name.startswith("build"):
        return "construction"
    if (
        name.startswith("research")
        or name.startswith("evolve")
        or (name.startswith("upgrade") and not name.startswith("upgradeto"))
    ):
        return "technology"
    if "rally" in name:
        return "rally_control"
    if "cancel" in name:
        return "cancel"
    if any(token in name for token in ("spawnlarva", "injectlarva", "chronoboost", "calldownmule")):
        return "race_macro"
    if any(
        token in name
        for token in (
            "morph",
            "upgradeto",
            "burrow",
            "unburrow",
            "siege",
            "unsiege",
            "lift",
            "land",
            "transform",
        )
    ):
        return "morph_transform"
    if any(token in name for token in ("load", "unload", "transport")):
        return "transport"
    if any(token in name for token in ("attack", "move", "patrol", "holdposition", "stop")):
        return "tactical_control"
    return "special_ability"


def _normalized_name(value: Any) -> str:
    return str(value or "").lower().replace(" ", "")


def _canonical_entity(name: Any) -> str:
    value = str(name or "Unknown")
    return ENTITY_ALIASES.get(value, value)


def _is_excluded_entity(name: Any) -> bool:
    normalized = _normalized_name(name)
    return normalized in EXCLUDED_ENTITY_NAMES or normalized.startswith(
        EXCLUDED_ENTITY_PREFIXES
    )


def _is_cosmetic_upgrade(name: Any, loop: int) -> bool:
    # Standard melee has no legitimate completed upgrades at frame zero. These
    # events describe account loadouts, entitlements, sprays, and dances.
    normalized = _normalized_name(name)
    return loop == 0 or normalized.startswith(COSMETIC_UPGRADE_PREFIXES)


def _is_excluded_command(event: Any) -> bool:
    normalized = _normalized_name(getattr(event, "ability_name", ""))
    return normalized in EXCLUDED_COMMAND_NAMES or normalized.startswith(
        EXCLUDED_COMMAND_PREFIXES
    )


def _recent(values: list[int], cutoff: int, window: int | None = None) -> int:
    right = bisect.bisect_right(values, cutoff)
    if window is None:
        return right
    return right - bisect.bisect_left(values, cutoff - window)


@dataclass
class _Unit:
    owner: int
    unit_type: str
    complete: bool


class _State:
    def __init__(self, player_ids: tuple[int, int]) -> None:
        self.player_ids = player_ids
        self.units: dict[int, _Unit] = {}
        self.stats: dict[int, tuple[int, dict[str, float | None]]] = {}
        self.upgrades = {pid: Counter() for pid in player_ids}
        self.flow = {pid: {name: [] for name in FLOW_NAMES} for pid in player_ids}
        self.control_groups = {pid: [] for pid in player_ids}
        self.commands = {
            pid: {name: [] for name in (*COMMAND_CLASSES, "__total__")}
            for pid in player_ids
        }

    def tracker(self, event: Any) -> None:
        name = event.__class__.__name__
        loop = int(getattr(event, "frame", 0) or 0)
        unit_id = int(getattr(event, "unit_id", 0) or 0)
        if name in {"UnitBornEvent", "UnitInitEvent"}:
            unit_type = _canonical_entity(getattr(event, "unit_type_name", "Unknown"))
            if _is_excluded_entity(unit_type):
                return
            owner = _owner_id(event)
            self.units[unit_id] = _Unit(owner, unit_type, name == "UnitBornEvent")
            if owner in self.flow:
                self.flow[owner]["born" if name == "UnitBornEvent" else "init"].append(loop)
        elif name == "UnitDoneEvent":
            unit = self.units.get(unit_id)
            if unit:
                unit.complete = True
                if unit.owner in self.flow:
                    self.flow[unit.owner]["done"].append(loop)
        elif name == "UnitTypeChangeEvent":
            unit = self.units.get(unit_id)
            if unit:
                unit_type = _canonical_entity(
                    getattr(event, "unit_type_name", "Unknown")
                )
                if _is_excluded_entity(unit_type):
                    self.units.pop(unit_id, None)
                else:
                    unit.unit_type = unit_type
        elif name == "UnitOwnerChangeEvent":
            unit = self.units.get(unit_id)
            if unit:
                unit.owner = _owner_id(event)
        elif name == "UnitDiedEvent":
            unit = self.units.pop(unit_id, None)
            if unit and unit.owner in self.flow:
                self.flow[unit.owner]["lost"].append(loop)
            killer = int(getattr(event, "killing_player_id", 0) or 0)
            if killer in self.flow:
                self.flow[killer]["killed"].append(loop)
        elif name == "UpgradeCompleteEvent":
            pid = _player_id(event) or int(getattr(event, "pid", 0) or 0)
            upgrade = str(getattr(event, "upgrade_type_name", "Unknown"))
            if _is_cosmetic_upgrade(upgrade, loop):
                return
            if pid in self.upgrades:
                self.upgrades[pid][upgrade] = max(self.upgrades[pid][upgrade], int(getattr(event, "count", 1) or 1))
                self.flow[pid]["upgrade"].append(loop)
        elif name == "PlayerStatsEvent":
            pid = _player_id(event) or int(getattr(event, "pid", 0) or 0)
            if pid in self.player_ids:
                self.stats[pid] = (
                    loop,
                    {
                        field: float(value) if isinstance((value := getattr(event, attr, None)), (int, float)) else None
                        for field, attr in STAT_ATTRIBUTES.items()
                    },
                )

    def game(self, event: Any) -> None:
        pid = _player_id(event)
        if pid not in self.player_ids:
            return
        name = event.__class__.__name__
        loop = int(getattr(event, "frame", 0) or 0)
        if "ControlGroupEvent" in name:
            self.control_groups[pid].append(loop)
        if "CommandEvent" in name:
            if _is_excluded_command(event):
                return
            semantic = _command_class(event)
            self.commands[pid][semantic].append(loop)
            self.commands[pid]["__total__"].append(loop)

    def snapshot(self, cutoff: int, metadata: dict[str, Any]) -> dict[str, Any] | None:
        if any(pid not in self.stats for pid in self.player_ids):
            return None
        own, enemy = self.player_ids
        row: dict[str, Any] = {**metadata, "time_seconds": cutoff / LOOPS_PER_SECOND}
        own_loop, own_stats = self.stats[own]
        enemy_loop, enemy_stats = self.stats[enemy]
        row["aggregate_self_age_loops"] = cutoff - own_loop
        row["aggregate_enemy_age_loops"] = cutoff - enemy_loop
        for field in STAT_ATTRIBUTES:
            left, right = own_stats[field], enemy_stats[field]
            row[f"aggregate_self__{field}"] = left
            row[f"aggregate_enemy__{field}"] = right
            row[f"aggregate_diff__{field}"] = left - right if left is not None and right is not None else None

        own_complete, own_progress = self._entities(own)
        enemy_complete, enemy_progress = self._entities(enemy)
        row.update({
            "entity_self_complete_json": dict(own_complete),
            "entity_self_in_progress_json": dict(own_progress),
            "entity_self_upgrades_json": dict(self.upgrades[own]),
            "entity_enemy_complete_json": dict(enemy_complete),
            "entity_enemy_in_progress_json": dict(enemy_progress),
            "entity_enemy_upgrades_json": dict(self.upgrades[enemy]),
            "entity_self_complete_total": sum(own_complete.values()),
            "entity_enemy_complete_total": sum(enemy_complete.values()),
            "entity_diff_complete_total": sum(own_complete.values()) - sum(enemy_complete.values()),
            "entity_self_in_progress_total": sum(own_progress.values()),
            "entity_enemy_in_progress_total": sum(enemy_progress.values()),
            "entity_diff_in_progress_total": sum(own_progress.values()) - sum(enemy_progress.values()),
        })
        self._count_family(row, "flow", self.flow, own, enemy, cutoff)
        self._count_family(
            row,
            "behavior",
            {pid: {"control_group": self.control_groups[pid]} for pid in self.player_ids},
            own,
            enemy,
            cutoff,
        )
        self._command_features(row, own, enemy, cutoff)
        self._neutralize_noncompetitive_behavior(row)
        return row

    def _entities(self, pid: int) -> tuple[Counter[str], Counter[str]]:
        complete: Counter[str] = Counter()
        progress: Counter[str] = Counter()
        for unit in self.units.values():
            if unit.owner == pid:
                (complete if unit.complete else progress)[unit.unit_type] += 1
        return complete, progress

    @staticmethod
    def _count_family(row: dict[str, Any], prefix: str, store: dict[int, dict[str, list[int]]], own: int, enemy: int, cutoff: int) -> None:
        for event_name in store[own]:
            for suffix, window in (("all", None), *WINDOWS):
                left = _recent(store[own][event_name], cutoff, window)
                right = _recent(store[enemy][event_name], cutoff, window)
                row[f"{prefix}_self__{event_name}__{suffix}"] = left
                row[f"{prefix}_enemy__{event_name}__{suffix}"] = right
                row[f"{prefix}_diff__{event_name}__{suffix}"] = left - right

    def _command_features(self, row: dict[str, Any], own: int, enemy: int, cutoff: int) -> None:
        elapsed_minutes = max(cutoff / LOOPS_PER_SECOND / 60, 1 / 60)
        suffixes = (("60s", WINDOWS[0][1]), ("240s", WINDOWS[1][1]), ("all", None))
        total_counts = {
            pid: tuple(_recent(self.commands[pid]["__total__"], cutoff, window) for _, window in suffixes)
            for pid in (own, enemy)
        }
        for semantic in COMMAND_CLASSES:
            counts = {
                pid: tuple(_recent(self.commands[pid][semantic], cutoff, window) for _, window in suffixes)
                for pid in (own, enemy)
            }
            for index, (suffix, _) in enumerate(suffixes):
                left, right = counts[own][index], counts[enemy][index]
                left_total, right_total = total_counts[own][index], total_counts[enemy][index]
                left_share = left / left_total if left_total else 0.0
                right_share = right / right_total if right_total else 0.0
                row[f"command_semantic_self__{semantic}__count__{suffix}"] = left
                row[f"command_semantic_enemy__{semantic}__count__{suffix}"] = right
                row[f"command_semantic_diff__{semantic}__count__{suffix}"] = left - right
                row[f"command_semantic_self__{semantic}__share__{suffix}"] = left_share
                row[f"command_semantic_enemy__{semantic}__share__{suffix}"] = right_share
                row[f"command_semantic_diff__{semantic}__share__{suffix}"] = left_share - right_share
            left_rate = counts[own][2] / elapsed_minutes
            right_rate = counts[enemy][2] / elapsed_minutes
            row[f"command_semantic_self__{semantic}__rate_per_minute__all"] = left_rate
            row[f"command_semantic_enemy__{semantic}__rate_per_minute__all"] = right_rate
            row[f"command_semantic_diff__{semantic}__rate_per_minute__all"] = left_rate - right_rate
        own_rate = total_counts[own][2] / elapsed_minutes
        enemy_rate = total_counts[enemy][2] / elapsed_minutes
        row["command_total_self__rate_per_minute__all"] = own_rate
        row["command_total_enemy__rate_per_minute__all"] = enemy_rate
        row["command_total_diff__rate_per_minute__all"] = own_rate - enemy_rate

    @staticmethod
    def _neutralize_noncompetitive_behavior(row: dict[str, Any]) -> None:
        # The frozen corpus lets protocol resolution, race-specific mechanics,
        # APM, and control-group habits leak into win probability. Preserve a
        # representative activity level for distribution compatibility, but
        # make it identical on both sides so it cannot express an advantage.
        for self_prefix, enemy_prefix, diff_prefix in (
            ("behavior_self__", "behavior_enemy__", "behavior_diff__"),
            (
                "command_semantic_self__",
                "command_semantic_enemy__",
                "command_semantic_diff__",
            ),
            ("command_total_self__", "command_total_enemy__", "command_total_diff__"),
        ):
            for key in tuple(row):
                if not key.startswith(self_prefix):
                    continue
                suffix = key[len(self_prefix) :]
                enemy_key = f"{enemy_prefix}{suffix}"
                left, right = row[key], row.get(enemy_key)
                if not isinstance(left, (int, float)) or not isinstance(
                    right, (int, float)
                ):
                    continue
                neutral = (left + right) / 2
                row[key] = neutral
                row[enemy_key] = neutral
                diff_key = f"{diff_prefix}{suffix}"
                if diff_key in row:
                    row[diff_key] = 0


def build_n3_feature_frames(path: Path) -> list[dict[str, Any]]:
    """Build the frozen N3 R1 feature contract directly from replay event streams."""
    replay = sc2reader.load_replay(str(path), load_level=4)
    players = list(getattr(replay, "players", ()))
    if len(players) != 2:
        return []
    player_ids = (int(players[0].pid), int(players[1].pid))
    races = [_race(str(getattr(player, "play_race", None) or getattr(player, "pick_race", ""))) for player in players]
    metadata = {
        "self_race": races[0],
        "enemy_race": races[1],
        "matchup": "v".join(sorted(race[:1] for race in races)),
        "map": str(getattr(replay, "map_name", "") or ""),
        "patch": str(getattr(replay, "release_string", "") or ""),
    }
    tracker = sorted(list(getattr(replay, "tracker_events", ())), key=lambda event: int(getattr(event, "frame", 0) or 0))
    games = sorted(list(getattr(replay, "game_events", ())), key=lambda event: int(getattr(event, "frame", 0) or 0))
    cutoffs = sorted({int(event.frame) for event in tracker if event.__class__.__name__ == "PlayerStatsEvent"})
    state = _State(player_ids)
    game_duration = float(getattr(replay, "game_length", 0).total_seconds())
    replay_frames = float(getattr(replay, "frames", 0) or 0)
    watcher_fps = replay_frames / game_duration if replay_frames and game_duration else LOOPS_PER_SECOND
    tracker_index = game_index = 0
    rows: list[dict[str, Any]] = []
    for cutoff in cutoffs:
        while tracker_index < len(tracker) and int(getattr(tracker[tracker_index], "frame", 0) or 0) <= cutoff:
            state.tracker(tracker[tracker_index])
            tracker_index += 1
        while game_index < len(games) and int(getattr(games[game_index], "frame", 0) or 0) <= cutoff:
            state.game(games[game_index])
            game_index += 1
        row = state.snapshot(cutoff, metadata)
        if row is not None:
            # The model contract uses Blizzard's fixed 22.4 loops/s. The watcher
            # duration uses the replay's rounded game length, so retain both clocks.
            row["_watcher_time"] = cutoff / watcher_fps
            rows.append(row)
    return rows
