import type { ReplayData } from "@/lib/types";

export type MapBounds = { minX: number; maxX: number; minY: number; maxY: number };
export type MapGeometry = ReplayData["mapGeometry"];

export function decodeMapRle(encoded: number[], expected: number) {
  const values = new Uint8Array(expected);
  let offset = 0;
  for (let index = 0; index + 1 < encoded.length && offset < expected; index += 2) {
    const length = encoded[index + 1];
    values.fill(encoded[index], offset, Math.min(expected, offset + length));
    offset += length;
  }
  return values;
}

export function playableBounds(geometry: MapGeometry, fallback: MapBounds): MapBounds {
  return geometry.source === "s2ma" && geometry.playableMinX != null && geometry.playableMaxX != null
    && geometry.playableMinY != null && geometry.playableMaxY != null
    ? { minX: geometry.playableMinX, maxX: geometry.playableMaxX, minY: geometry.playableMinY, maxY: geometry.playableMaxY }
    : fallback;
}

export function createIsometricProjection(geometry: MapGeometry, bounds: MapBounds) {
  const gridWidth = geometry.gridWidth ?? 0;
  const gridHeight = geometry.gridHeight ?? 0;
  const mapWidth = geometry.width ?? 0;
  const mapHeight = geometry.height ?? 0;
  const levels = decodeMapRle(geometry.cliffRle, gridWidth * gridHeight);
  const sampleLevel = (x: number, y: number) => {
    if (!gridWidth || !gridHeight || !mapWidth || !mapHeight) return 0;
    const column = Math.max(0, Math.min(gridWidth - 1, Math.floor((x / mapWidth) * gridWidth)));
    const row = Math.max(0, Math.min(gridHeight - 1, Math.floor((y / mapHeight) * gridHeight)));
    return levels[row * gridWidth + column] ?? 0;
  };
  let minLevel = 255;
  let maxLevel = 0;
  const sampleStep = Math.max(1, Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 48);
  for (let y = bounds.minY; y <= bounds.maxY; y += sampleStep) {
    for (let x = bounds.minX; x <= bounds.maxX; x += sampleStep) {
      const level = sampleLevel(x, y);
      minLevel = Math.min(minLevel, level);
      maxLevel = Math.max(maxLevel, level);
    }
  }
  if (minLevel === 255) minLevel = 0;
  const levelSpan = Math.max(1, maxLevel - minLevel);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const project = (x: number, y: number, level = sampleLevel(x, y)) => {
    const normalizedX = (x - bounds.minX) / width;
    const normalizedY = (y - bounds.minY) / height;
    const elevation = (level - minLevel) / levelSpan;
    return {
      left: 50 + (normalizedX - normalizedY) * 46,
      bottom: 11 + (normalizedX + normalizedY) * 35 + elevation * 9,
    };
  };
  return { project, sampleLevel, minLevel, maxLevel };
}
