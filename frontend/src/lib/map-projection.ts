import type { ReplayData } from "@/lib/types";

export type MapBounds = { minX: number; maxX: number; minY: number; maxY: number };
export type MapGeometry = ReplayData["mapGeometry"];

export function playableBounds(geometry: MapGeometry, fallback: MapBounds): MapBounds {
  if (geometry.source !== "s2ma" || geometry.playableMinX == null || geometry.playableMaxX == null
    || geometry.playableMinY == null || geometry.playableMaxY == null) return fallback;
  return {
    minX: Math.max(0, Math.min(geometry.playableMinX, fallback.minX)),
    maxX: Math.min(geometry.width ?? Number.POSITIVE_INFINITY, Math.max(geometry.playableMaxX, fallback.maxX)),
    minY: Math.max(0, Math.min(geometry.playableMinY, fallback.minY)),
    maxY: Math.min(geometry.height ?? Number.POSITIVE_INFINITY, Math.max(geometry.playableMaxY, fallback.maxY)),
  };
}

export function projectedHeading(project: (x: number, y: number) => { left: number; bottom: number }, x: number, y: number, heading: number) {
  const radians = heading * Math.PI / 180;
  const origin = project(x, y);
  const target = project(x + Math.cos(radians) * 2, y + Math.sin(radians) * 2);
  return Math.atan2(-(target.bottom - origin.bottom), target.left - origin.left) * 180 / Math.PI;
}
