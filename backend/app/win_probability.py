from __future__ import annotations

import json
import math
import os
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterator


DEFAULT_BASE_URL = "https://c-vellames--sc2-winprob-lightgbm-v1.modal.run"
BATCH_SIZE = 64
CADENCE_SECONDS = 0.25

_STAT_FEATURES = {
    "scoreValueFoodMade": "supplyCap",
    "scoreValueFoodUsed": "supplyUsed",
    "scoreValueMineralsCollectionRate": "mineralRate",
    "scoreValueMineralsCurrent": "minerals",
    "scoreValueMineralsUsedCurrentArmy": "armyMinerals",
    "scoreValueVespeneCollectionRate": "vespeneRate",
    "scoreValueVespeneCurrent": "vespene",
    "scoreValueVespeneUsedCurrentArmy": "armyVespene",
    "scoreValueWorkersActiveCount": "workers",
}


class WinProbabilityUnavailable(RuntimeError):
    """The optional inference service cannot currently produce a timeline."""


def _base_url() -> str:
    return os.getenv("SC2_WINPROB_URL", DEFAULT_BASE_URL).rstrip("/")


@lru_cache(maxsize=1)
def _credentials() -> dict[str, str]:
    key = os.getenv("MODAL_PROXY_TOKEN_ID") or os.getenv("MODAL_KEY")
    secret = os.getenv("MODAL_PROXY_TOKEN_SECRET") or os.getenv("MODAL_SECRET")
    if key and secret:
        return {"Modal-Key": key, "Modal-Secret": secret}

    configured_path = os.getenv("MODAL_PROXY_TOKEN_PATH")
    candidates = [Path(configured_path)] if configured_path else []
    candidates.append(
        Path(__file__).resolve().parents[3]
        / "sc2analysispaper"
        / ".local"
        / "modal_proxy_token.json"
    )
    for path in candidates:
        if not path.is_file():
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if payload.get("Modal-Key") and payload.get("Modal-Secret"):
            return {
                "Modal-Key": str(payload["Modal-Key"]),
                "Modal-Secret": str(payload["Modal-Secret"]),
            }
    raise WinProbabilityUnavailable("Modal proxy credentials are not configured")


def _request_json(path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    headers = {**_credentials(), "Accept": "application/json"}
    data = None
    method = "GET"
    if payload is not None:
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
        method = "POST"
    request = urllib.request.Request(
        f"{_base_url()}{path}", data=data, headers=headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.load(response)
    except (OSError, ValueError, urllib.error.HTTPError) as exc:
        raise WinProbabilityUnavailable("Win probability inference failed") from exc
    if not isinstance(result, dict):
        raise WinProbabilityUnavailable("Inference returned an invalid response")
    return result


@lru_cache(maxsize=1)
def inference_schema() -> dict[str, Any]:
    schema = _request_json("/v1/schema")
    if not isinstance(schema.get("required_features"), list):
        raise WinProbabilityUnavailable("Inference schema is invalid")
    return schema


def _race(value: str) -> str:
    race = value.lower()
    if race.startswith("prot"):
        return "Prot"
    if race.startswith("terr"):
        return "Terr"
    if race.startswith("zerg"):
        return "Zerg"
    return value


def _matchup(players: list[dict[str, Any]]) -> str:
    initials = sorted(_race(str(player.get("race", "")))[:1] for player in players[:2])
    return "v".join(initials)


def _entity_maps(
    frame: dict[str, Any], player_id: int, completed_upgrades: Counter[str]
) -> tuple[dict[str, int], dict[str, int], dict[str, int]]:
    complete: Counter[str] = Counter()
    in_progress: Counter[str] = Counter()
    for unit in frame.get("units", []):
        if unit.get("ownerId") != player_id or unit.get("category") == "resource":
            continue
        target = complete if unit.get("completed", True) else in_progress
        target[str(unit.get("type") or "Unknown")] += 1
    return dict(complete), dict(in_progress), dict(completed_upgrades)


def _snapshot(
    required: list[str],
    replay: dict[str, Any],
    frame: dict[str, Any],
    time_seconds: float,
    self_player: dict[str, Any],
    enemy_player: dict[str, Any],
    upgrades: dict[int, Counter[str]],
) -> dict[str, Any]:
    values: dict[str, Any] = {feature: None for feature in required}
    values["time_seconds"] = time_seconds
    values["self_race"] = _race(str(self_player.get("race", "")))
    values["enemy_race"] = _race(str(enemy_player.get("race", "")))
    values["matchup"] = _matchup(replay["players"])
    values["map"] = replay["meta"].get("map")
    values["patch"] = replay["meta"].get("gameVersion")

    self_id = int(self_player["id"])
    enemy_id = int(enemy_player["id"])
    stats = frame.get("stats", {})
    own_stats = stats.get(str(self_id), {})
    opposing_stats = stats.get(str(enemy_id), {})
    for protocol_name, watcher_name in _STAT_FEATURES.items():
        own = own_stats.get(watcher_name)
        opposing = opposing_stats.get(watcher_name)
        if isinstance(own, (int, float)):
            values[f"aggregate_self__{protocol_name}"] = own
        if isinstance(opposing, (int, float)):
            values[f"aggregate_enemy__{protocol_name}"] = opposing
        if isinstance(own, (int, float)) and isinstance(opposing, (int, float)):
            values[f"aggregate_diff__{protocol_name}"] = own - opposing

    own_complete, own_progress, own_upgrades = _entity_maps(
        frame, self_id, upgrades[self_id]
    )
    enemy_complete, enemy_progress, enemy_upgrades = _entity_maps(
        frame, enemy_id, upgrades[enemy_id]
    )
    values.update(
        {
            "entity_self_complete_json": own_complete,
            "entity_self_in_progress_json": own_progress,
            "entity_self_upgrades_json": own_upgrades,
            "entity_enemy_complete_json": enemy_complete,
            "entity_enemy_in_progress_json": enemy_progress,
            "entity_enemy_upgrades_json": enemy_upgrades,
        }
    )
    return {name: values.get(name) for name in required}


def iter_snapshots(
    replay: dict[str, Any], schema: dict[str, Any]
) -> Iterator[tuple[float, dict[str, Any]]]:
    players = replay.get("players", [])[:2]
    frames = replay.get("frames", [])
    if len(players) != 2 or not frames:
        raise WinProbabilityUnavailable("A 1v1 world timeline is required")
    required = [str(value) for value in schema["required_features"]]
    duration = max(0.0, float(replay.get("meta", {}).get("duration", 0)))
    build_order = sorted(
        replay.get("buildOrder", []), key=lambda item: item.get("completedAt", 0)
    )
    upgrades: dict[int, Counter[str]] = {
        int(players[0]["id"]): Counter(),
        int(players[1]["id"]): Counter(),
    }
    frame_index = 0
    build_index = 0
    final_tick = math.ceil(duration / CADENCE_SECONDS)
    for tick in range(final_tick + 1):
        time_seconds = min(duration, tick * CADENCE_SECONDS)
        while (
            frame_index + 1 < len(frames)
            and float(frames[frame_index + 1].get("time", 0)) <= time_seconds
        ):
            frame_index += 1
        while (
            build_index < len(build_order)
            and float(build_order[build_index].get("completedAt", 0)) <= time_seconds
        ):
            item = build_order[build_index]
            if (
                item.get("kind") == "upgrade"
                and int(item.get("playerId", -1)) in upgrades
            ):
                upgrades[int(item["playerId"])][
                    str(item.get("product") or "Unknown")
                ] += 1
            build_index += 1
        yield time_seconds, _snapshot(
            required,
            replay,
            frames[frame_index],
            time_seconds,
            players[0],
            players[1],
            upgrades,
        )


def build_win_probability_series(replay: dict[str, Any], request_id: str) -> dict[str, Any]:
    schema = inference_schema()
    points: list[dict[str, float]] = []
    batches: list[list[tuple[float, dict[str, Any]]]] = []
    batch: list[tuple[float, dict[str, Any]]] = []
    model = str(schema.get("model", "SC2-WinProb-LightGBM-v1"))

    def predict(
        current: list[tuple[float, dict[str, Any]]],
    ) -> tuple[str, list[dict[str, float]]]:
        response = _request_json(
            "/v1/predict",
            {
                "request_id": request_id,
                "snapshots": [snapshot for _, snapshot in current],
            },
        )
        predictions = response.get("predictions")
        if not isinstance(predictions, list) or len(predictions) != len(current):
            raise WinProbabilityUnavailable("Inference returned an incomplete batch")
        batch_points: list[dict[str, float]] = []
        for (time_seconds, _), prediction in zip(current, predictions, strict=True):
            try:
                probability = float(prediction["win_probability"])
            except (KeyError, TypeError, ValueError) as exc:
                raise WinProbabilityUnavailable(
                    "Inference returned an invalid probability"
                ) from exc
            if not 0 <= probability <= 1:
                raise WinProbabilityUnavailable("Inference returned an invalid probability")
            batch_points.append(
                {
                    "time": time_seconds,
                    "playerOne": probability,
                    "playerTwo": 1.0 - probability,
                }
            )
        return str(response.get("model") or model), batch_points

    for item in iter_snapshots(replay, schema):
        batch.append(item)
        if len(batch) == BATCH_SIZE:
            batches.append(batch)
            batch = []
    if batch:
        batches.append(batch)
    try:
        configured_workers = int(os.getenv("SC2_WINPROB_CONCURRENCY", "8"))
    except ValueError:
        configured_workers = 8
    worker_count = max(1, min(8, configured_workers))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        for batch_model, batch_points in executor.map(predict, batches):
            model = batch_model
            points.extend(batch_points)
    return {
        "status": "ready",
        "model": model,
        "modelSha256": None,
        "perspectivePlayerId": int(replay["players"][0]["id"]),
        "cadenceSeconds": CADENCE_SECONDS,
        "experimental": True,
        "points": points,
    }
