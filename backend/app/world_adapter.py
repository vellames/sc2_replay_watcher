from __future__ import annotations

import base64
import tempfile
from pathlib import Path
from typing import Any

from sc2_world_engine import WorldArchiveReader, compile_replay

PLAYER_COLORS = ("#48a9ff", "#ff5b72", "#55d68b", "#f4b942")


def _unit_payload(entity: Any) -> dict[str, Any]:
    return {
        "id": entity.id,
        "type": entity.type,
        "ownerId": entity.owner_id,
        "x": entity.x,
        "y": entity.y,
        "category": entity.category,
        "isBuilding": entity.category == "building",
        "isTownHall": entity.town_hall,
        "isArmy": entity.army,
        "positionSource": entity.position_confidence.value,
        "isMoving": entity.moving,
        "heading": entity.heading,
        "targetX": entity.target_x,
        "targetY": entity.target_y,
        "activity": entity.activity,
        "completed": entity.completed,
        "mineralCost": entity.mineral_cost,
        "vespeneCost": entity.vespene_cost,
        "supplyCost": entity.supply_cost,
        "attachmentId": entity.attachment_id,
        "baseId": entity.base_id,
        "armyGroupId": entity.army_group_id,
        "movementSpeed": entity.movement_speed,
    }


def _frame_payload(frame: Any) -> dict[str, Any]:
    return {
        "time": frame.time,
        "units": [_unit_payload(entity) for entity in frame.entities],
        "stats": {
            str(pid): state.to_dict() for pid, state in sorted(frame.players.items())
        },
        "deaths": [death.to_dict() for death in frame.deaths],
        "production": {
            str(pid): [order.to_dict() for order in orders]
            for pid, orders in sorted(frame.production.items())
        },
        "cameras": {
            str(pid): camera.to_dict() for pid, camera in sorted(frame.cameras.items())
        },
        "bases": [base.to_dict() for base in frame.bases],
        "armyGroups": [group.to_dict() for group in frame.army_groups],
    }


def watcher_payload(
    reader: WorldArchiveReader, *, filename: str | None = None
) -> dict[str, Any]:
    """Adapt a validated world archive to the current watcher transport contract."""
    manifest = reader.manifest
    source = manifest["source"]
    match = manifest["match"]
    diagnostics = manifest.get("diagnostics", {})
    map_visual = reader.map_visual()
    map_geometry = reader.map_geometry()
    map_visual_url = None
    if map_visual.data and map_visual.mime_type:
        encoded = base64.b64encode(map_visual.data).decode("ascii")
        map_visual_url = f"data:{map_visual.mime_type};base64,{encoded}"
    players = [
        {**player, "color": PLAYER_COLORS[index % len(PLAYER_COLORS)]}
        for index, player in enumerate(match.get("players", []))
    ]
    return {
        "meta": {
            "filename": filename or source["filename"],
            "map": match["map"],
            "duration": match["duration"],
            "playedAt": match.get("playedAt"),
            "gameVersion": source["release"],
            "winner": match.get("winner"),
            "trackedEvents": diagnostics.get("trackedEvents", 0),
            "movementOrders": diagnostics.get("movementOrders", 0),
            "cameraEvents": diagnostics.get("cameraEvents", 0),
            "navigationSource": diagnostics.get("navigationSource", "straight-line"),
            "routedSegments": diagnostics.get("routedSegments", 0),
            "routingFallbacks": diagnostics.get("routingFallbacks", 0),
            "astarRoutes": diagnostics.get("astarRoutes", 0),
            "positionModel": "world-engine",
            "cameraModel": "recorded-sample-hold",
            "worldSchemaVersion": manifest["schemaVersion"],
            "engineVersion": manifest["engineVersion"],
            "estimatedPositionRatio": diagnostics.get("estimatedPositionRatio", 0),
            "capabilities": {
                "unitEconomy": True,
                "liveVitals": False,
                "playerCameras": True,
                "mapNavigation": diagnostics.get("navigationSource") == "s2ma-grid",
                "semanticBases": True,
                "stableArmyGroups": True,
                "engagements": True,
                "analyticTimeline": True,
            },
        },
        "players": players,
        "mapBounds": manifest["mapBounds"],
        "mapVisual": {
            "source": map_visual.source,
            "dataUrl": map_visual_url,
            "width": map_visual.width,
            "height": map_visual.height,
            "mapWidth": map_visual.map_width,
            "mapHeight": map_visual.map_height,
        },
        "mapGeometry": {
            "source": map_geometry.source,
            "width": map_geometry.width,
            "height": map_geometry.height,
            "gridWidth": map_geometry.grid_width,
            "gridHeight": map_geometry.grid_height,
            "cliffRle": map_geometry.cliff_rle,
            "walkableRle": map_geometry.walkable_rle,
            "buildableRle": map_geometry.buildable_rle,
            "clearanceRle": map_geometry.clearance_rle,
            "ramps": map_geometry.ramps,
            "staticObjects": map_geometry.static_objects,
        },
        "cameraSamples": {
            str(player_id): [camera.to_dict() for camera in samples]
            for player_id, samples in reader.camera_samples().items()
        },
        "cameraAnalytics": manifest.get("cameraAnalytics", {}),
        "timeline": manifest.get("timeline", []),
        "buildOrder": manifest.get("buildOrder", []),
        "engagements": manifest.get("engagements", []),
        "frames": [_frame_payload(frame) for frame in reader.iter_frames()],
    }


def parse_replay(path: Path, *, filename: str | None = None) -> dict[str, Any]:
    """Compile a LotV replay through the world engine and return the watcher payload."""
    path = Path(path)
    with tempfile.TemporaryDirectory(prefix="sc2-world-") as directory:
        archive_path = Path(directory) / "replay.sc2world"
        compile_replay(path, archive_path)
        return watcher_payload(WorldArchiveReader(archive_path), filename=filename)
