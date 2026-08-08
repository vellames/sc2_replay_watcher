"use client";

import { useEffect, useRef } from "react";

import type { ReplayData } from "@/lib/types";

type TerrainGeometry = ReplayData["mapGeometry"];
type Point = [number, number];

type BoundaryEdge = { a: Point; b: Point };

function decodeRle(encoded: number[], expected: number) {
  const values = new Uint8Array(expected);
  let offset = 0;
  for (let index = 0; index + 1 < encoded.length && offset < expected; index += 2) {
    values.fill(encoded[index], offset, Math.min(expected, offset + encoded[index + 1]));
    offset += encoded[index + 1];
  }
  return values;
}

function pointKey([x, y]: Point) {
  return `${x},${y}`;
}

function distanceToSegmentSquared(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  const ratio = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  const projectedX = start[0] + ratio * dx;
  const projectedY = start[1] + ratio * dy;
  return (point[0] - projectedX) ** 2 + (point[1] - projectedY) ** 2;
}

function simplifyOpenPath(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;
  let farthestIndex = 0;
  let farthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceToSegmentSquared(points[index], points[0], points[points.length - 1]);
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = index;
    }
  }
  if (farthestDistance <= tolerance ** 2) return [points[0], points[points.length - 1]];
  const left = simplifyOpenPath(points.slice(0, farthestIndex + 1), tolerance);
  const right = simplifyOpenPath(points.slice(farthestIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

function simplifyBoundary(points: Point[], tolerance = 1.25) {
  if (points.length < 5 || pointKey(points[0]) !== pointKey(points[points.length - 1])) return simplifyOpenPath(points, tolerance);
  const ring = points.slice(0, -1);
  let splitIndex = 1;
  let splitDistance = 0;
  for (let index = 1; index < ring.length; index += 1) {
    const distance = (ring[index][0] - ring[0][0]) ** 2 + (ring[index][1] - ring[0][1]) ** 2;
    if (distance > splitDistance) {
      splitDistance = distance;
      splitIndex = index;
    }
  }
  const firstHalf = simplifyOpenPath(ring.slice(0, splitIndex + 1), tolerance);
  const secondHalf = simplifyOpenPath([...ring.slice(splitIndex), ring[0]], tolerance);
  return [...firstHalf.slice(0, -1), ...secondHalf];
}

function traceBoundaryEdges(edges: BoundaryEdge[], tolerance = 1.25) {
  const adjacency = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    for (const point of [edge.a, edge.b]) {
      const key = pointKey(point);
      adjacency.set(key, [...(adjacency.get(key) ?? []), index]);
    }
  });

  const visited = new Uint8Array(edges.length);
  const paths: Point[][] = [];
  const edgeOrder = edges.map((_, index) => index).sort((left, right) => {
    const endpointScore = (index: number) => {
      const edge = edges[index];
      return Number((adjacency.get(pointKey(edge.a))?.length ?? 0) !== 2) + Number((adjacency.get(pointKey(edge.b))?.length ?? 0) !== 2);
    };
    return endpointScore(right) - endpointScore(left);
  });
  for (const edgeIndex of edgeOrder) {
    if (visited[edgeIndex]) continue;
    const edge = edges[edgeIndex];
    const path: Point[] = [edge.a, edge.b];
    visited[edgeIndex] = 1;
    let previous = edge.a;
    let current = edge.b;
    let guard = 0;
    while (pointKey(current) !== pointKey(path[0]) && guard < edges.length) {
      const candidates = (adjacency.get(pointKey(current)) ?? []).filter((index) => !visited[index]);
      if (!candidates.length) break;
      const incomingX = current[0] - previous[0];
      const incomingY = current[1] - previous[1];
      candidates.sort((leftIndex, rightIndex) => {
        const nextPoint = (candidateIndex: number) => pointKey(edges[candidateIndex].a) === pointKey(current) ? edges[candidateIndex].b : edges[candidateIndex].a;
        const left = nextPoint(leftIndex);
        const right = nextPoint(rightIndex);
        const leftScore = incomingX * (left[0] - current[0]) + incomingY * (left[1] - current[1]);
        const rightScore = incomingX * (right[0] - current[0]) + incomingY * (right[1] - current[1]);
        return rightScore - leftScore;
      });
      const nextEdgeIndex = candidates[0];
      const nextEdge = edges[nextEdgeIndex];
      const next = pointKey(nextEdge.a) === pointKey(current) ? nextEdge.b : nextEdge.a;
      visited[nextEdgeIndex] = 1;
      previous = current;
      current = next;
      path.push(current);
      guard += 1;
    }
    paths.push(simplifyBoundary(path, tolerance));
  }
  return paths;
}

function traceWalkableBoundaries(walkable: Uint8Array, width: number, height: number) {
  const edges: BoundaryEdge[] = [];
  const isWalkable = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height && walkable[y * width + x] === 1;
  const addEdge = (a: Point, b: Point) => edges.push({ a, b });

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isWalkable(x, y)) continue;
      if (!isWalkable(x - 1, y)) addEdge([x, y], [x, y + 1]);
      if (!isWalkable(x + 1, y)) addEdge([x + 1, y + 1], [x + 1, y]);
      if (!isWalkable(x, y - 1)) addEdge([x + 1, y], [x, y]);
      if (!isWalkable(x, y + 1)) addEdge([x, y + 1], [x + 1, y + 1]);
    }
  }
  return traceBoundaryEdges(edges);
}

function traceCliffBoundaries(levels: Uint8Array, width: number, height: number) {
  const edges: BoundaryEdge[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const level = levels[y * width + x];
      if (x + 1 < width && levels[y * width + x + 1] !== level) edges.push({ a: [x + 1, y], b: [x + 1, y + 1] });
      if (y + 1 < height && levels[(y + 1) * width + x] !== level) edges.push({ a: [x, y + 1], b: [x + 1, y + 1] });
    }
  }
  return traceBoundaryEdges(edges, 1.1);
}

export function TerrainLayer({ geometry }: { geometry: TerrainGeometry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gridWidth = geometry.gridWidth ?? 0;
    const gridHeight = geometry.gridHeight ?? 0;
    const mapWidth = geometry.width ?? 0;
    const mapHeight = geometry.height ?? 0;
    if (!canvas || !gridWidth || !gridHeight || !mapWidth || !mapHeight) return;

    const scale = 4;
    canvas.width = mapWidth * scale;
    canvas.height = mapHeight * scale;
    const context = canvas.getContext("2d");
    if (!context) return;

    const levels = decodeRle(geometry.cliffRle, gridWidth * gridHeight);
    const walkable = decodeRle(geometry.walkableRle, mapWidth * mapHeight);
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "rgba(103, 161, 182, .07)";
    context.lineWidth = Math.max(1, scale * .2);
    const cliffScaleX = mapWidth / gridWidth;
    const cliffScaleY = mapHeight / gridHeight;
    for (const boundary of traceCliffBoundaries(levels, gridWidth, gridHeight)) {
      if (boundary.length < 2) continue;
      context.beginPath();
      context.moveTo(boundary[0][0] * cliffScaleX * scale, (mapHeight - boundary[0][1] * cliffScaleY) * scale);
      for (const [x, y] of boundary.slice(1)) context.lineTo(x * cliffScaleX * scale, (mapHeight - y * cliffScaleY) * scale);
      context.stroke();
    }

    context.strokeStyle = "rgba(79, 135, 158, .5)";
    context.lineWidth = Math.max(1, scale * .34);
    for (const boundary of traceWalkableBoundaries(walkable, mapWidth, mapHeight)) {
      if (boundary.length < 2) continue;
      context.beginPath();
      context.moveTo(boundary[0][0] * scale, (mapHeight - boundary[0][1]) * scale);
      for (const [x, y] of boundary.slice(1)) context.lineTo(x * scale, (mapHeight - y) * scale);
      context.stroke();
    }

    for (const ramp of geometry.ramps) {
      const x = ramp.x * scale;
      const y = (mapHeight - ramp.y) * scale;
      const angle = ramp.direction * Math.PI / 4;
      const length = 5 * scale;
      context.save();
      context.translate(x, y);
      context.rotate(-angle);
      context.strokeStyle = "rgba(102, 203, 231, .24)";
      context.lineWidth = scale * .9;
      context.beginPath();
      context.moveTo(-length / 2, 0);
      context.lineTo(length / 2, 0);
      context.stroke();
      context.restore();
    }

    for (const item of geometry.staticObjects) {
      const x = item.x * scale;
      const y = (mapHeight - item.y) * scale;
      context.save();
      context.translate(x, y);
      context.rotate(-item.rotation);
      context.strokeStyle = "rgba(231, 174, 112, .2)";
      context.lineWidth = scale * .32;
      context.strokeRect(-3 * scale, -2 * scale, 6 * scale, 4 * scale);
      context.restore();
    }
  }, [geometry]);

  return <canvas ref={canvasRef} className="terrain-layer" aria-hidden="true" />;
}
