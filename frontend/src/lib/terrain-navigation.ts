import { decodeMapRle, type MapGeometry } from "./map-projection.ts";

type Point = { x: number; y: number };

export type TerrainNavigator = {
  levelAt: (x: number, y: number) => number;
  pointBetween: (start: Point, end: Point, progress: number) => Point;
};

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function pointOnPath(path: Point[], progress: number) {
  const total = path.slice(1).reduce((sum, point, index) => sum + distance(path[index], point), 0);
  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const length = distance(start, end);
    if (remaining <= length) {
      const ratio = length ? remaining / length : 0;
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    }
    remaining -= length;
  }
  return path.at(-1) ?? { x: 0, y: 0 };
}

export function createTerrainNavigator(geometry: MapGeometry): TerrainNavigator | null {
  const width = Math.floor(geometry.width ?? 0);
  const height = Math.floor(geometry.height ?? 0);
  const cliffWidth = geometry.gridWidth ?? 0;
  const cliffHeight = geometry.gridHeight ?? 0;
  if (geometry.source !== "s2ma" || !width || !height || !cliffWidth || !cliffHeight || !geometry.walkableRle.length) return null;

  const walkable = decodeMapRle(geometry.walkableRle, width * height);
  const cliffs = decodeMapRle(geometry.cliffRle, cliffWidth * cliffHeight);
  const valid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && walkable[y * width + x] === 1;
  const levelAt = (x: number, y: number) => {
    const column = Math.max(0, Math.min(cliffWidth - 1, Math.floor(x / width * Math.max(1, cliffWidth - 1))));
    const row = Math.max(0, Math.min(cliffHeight - 1, Math.floor(y / height * Math.max(1, cliffHeight - 1))));
    return cliffs[row * cliffWidth + column] ?? 0;
  };
  const nearest = (point: Point) => {
    const originX = Math.max(0, Math.min(width - 1, Math.floor(point.x)));
    const originY = Math.max(0, Math.min(height - 1, Math.floor(point.y)));
    if (valid(originX, originY)) return { x: originX, y: originY };
    for (let radius = 1; radius <= 8; radius += 1) {
      let best: { x: number; y: number; distance: number } | null = null;
      for (let y = Math.max(0, originY - radius); y <= Math.min(height - 1, originY + radius); y += 1) {
        for (let x = Math.max(0, originX - radius); x <= Math.min(width - 1, originX + radius); x += 1) {
          if (Math.max(Math.abs(x - originX), Math.abs(y - originY)) !== radius || !valid(x, y)) continue;
          const candidateDistance = Math.hypot(x + .5 - point.x, y + .5 - point.y);
          if (!best || candidateDistance < best.distance) best = { x, y, distance: candidateDistance };
        }
      }
      if (best) return { x: best.x, y: best.y };
    }
    return null;
  };
  const lineClear = (start: Point, end: Point) => {
    let x0 = Math.floor(start.x), y0 = Math.floor(start.y);
    const x1 = Math.floor(end.x), y1 = Math.floor(end.y);
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const stepX = x0 < x1 ? 1 : -1, stepY = y0 < y1 ? 1 : -1;
    let error = dx - dy;
    while (true) {
      if (!valid(x0, y0)) return false;
      if (x0 === x1 && y0 === y1) return true;
      const doubled = error * 2;
      const previousX = x0, previousY = y0;
      if (doubled > -dy) { error -= dy; x0 += stepX; }
      if (doubled < dx) { error += dx; y0 += stepY; }
      if (x0 !== previousX && y0 !== previousY && (!valid(x0, previousY) || !valid(previousX, y0))) return false;
    }
  };

  const cache = new Map<string, Point[] | null>();
  const route = (startPoint: Point, endPoint: Point) => {
    const start = nearest(startPoint);
    const goal = nearest(endPoint);
    if (!start || !goal) return null;
    const key = `${start.x}:${start.y}:${goal.x}:${goal.y}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached && [startPoint, ...cached.slice(1, -1), endPoint];
    if (lineClear(start, goal)) {
      const direct = [startPoint, endPoint];
      cache.set(key, direct);
      return direct;
    }

    const cellKey = (point: Point) => point.y * width + point.x;
    const frontier: Array<{ point: Point; score: number }> = [{ point: start, score: 0 }];
    const costs = new Map([[cellKey(start), 0]]);
    const previous = new Map<number, Point>();
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    let found = false;
    while (frontier.length) {
      let bestIndex = 0;
      for (let index = 1; index < frontier.length; index += 1) if (frontier[index].score < frontier[bestIndex].score) bestIndex = index;
      const current = frontier.splice(bestIndex, 1)[0].point;
      if (current.x === goal.x && current.y === goal.y) { found = true; break; }
      const currentCost = costs.get(cellKey(current)) ?? Number.POSITIVE_INFINITY;
      for (const [dx, dy] of directions) {
        const next = { x: current.x + dx, y: current.y + dy };
        if (!valid(next.x, next.y) || (dx && dy && (!valid(current.x + dx, current.y) || !valid(current.x, current.y + dy)))) continue;
        const nextCost = currentCost + (dx && dy ? Math.SQRT2 : 1);
        const nextKey = cellKey(next);
        if (nextCost >= (costs.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue;
        costs.set(nextKey, nextCost);
        previous.set(nextKey, current);
        frontier.push({ point: next, score: nextCost + Math.hypot(goal.x - next.x, goal.y - next.y) });
      }
    }
    if (!found) { cache.set(key, null); return null; }

    const cells = [goal];
    while (cells[0].x !== start.x || cells[0].y !== start.y) cells.unshift(previous.get(cellKey(cells[0]))!);
    const simplified = [cells[0]];
    for (let anchor = 0; anchor < cells.length - 1;) {
      let candidate = cells.length - 1;
      while (candidate > anchor + 1 && !lineClear(cells[anchor], cells[candidate])) candidate -= 1;
      simplified.push(cells[candidate]);
      anchor = candidate;
    }
    const path = [startPoint, ...simplified.slice(1, -1).map((point) => ({ x: point.x + .5, y: point.y + .5 })), endPoint];
    cache.set(key, path);
    return path;
  };

  return {
    levelAt,
    pointBetween(start, end, progress) {
      const linear = { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress };
      if (levelAt(start.x, start.y) === levelAt(end.x, end.y)) return linear;
      const path = route(start, end);
      if (!path || path.length <= 2) return linear;
      const directDistance = distance(start, end);
      const routeDistance = path.slice(1).reduce((sum, point, index) => sum + distance(path[index], point), 0);
      // Sparse tracker corrections can put a ground unit on the wrong side of a cliff.
      // A huge detour would turn that uncertainty into an obviously fictitious sprint.
      if (routeDistance > Math.max(directDistance * 2.75, directDistance + 12)) return linear;
      return pointOnPath(path, progress);
    },
  };
}
