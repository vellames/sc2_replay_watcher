"""Backward-compatible import for callers migrating to the standalone world engine."""

from .world_adapter import parse_replay

__all__ = ["parse_replay"]
