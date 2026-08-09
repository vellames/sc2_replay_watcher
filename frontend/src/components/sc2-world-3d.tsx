"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { sc2ModelAsset } from "@/lib/sc2-3d-assets";
import { canonicalSc2Type } from "@/lib/sc2-catalog";
import { decodeMapRle, type MapBounds, type MapGeometry } from "@/lib/map-projection";
import type { ReplayUnit } from "@/lib/types";

type WorldUnit = ReplayUnit & { color: string; race?: string };
type Props = {
  bounds: MapBounds;
  geometry: MapGeometry;
  onSelect: (id: number) => void;
  rotation: number;
  selectedUnitId: number | null;
  showTerrain: boolean;
  units: WorldUnit[];
  zoom: number;
};

type ModelGeometry = { body: THREE.BufferGeometry; accent: THREE.BufferGeometry };
type Primitive = THREE.BufferGeometry;
type BatchPick = { ids: number[]; meshes: THREE.InstancedMesh[] };
type DisplayedTransform = { x: number; y: number; heading: number };

const modelCache = new Map<string, ModelGeometry>();

function transformed(geometry: Primitive, position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] = [0, 0, 0]) {
  geometry.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
    new THREE.Vector3(...scale),
  ));
  return geometry;
}

function box(parts: Primitive[], position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number]) {
  parts.push(transformed(new THREE.BoxGeometry(1, 1, 1), position, scale, rotation));
}

function sphere(parts: Primitive[], position: [number, number, number], scale: [number, number, number], detail = 1) {
  parts.push(transformed(new THREE.IcosahedronGeometry(.5, detail), position, scale));
}

function cylinder(parts: Primitive[], position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number], sides = 8) {
  parts.push(transformed(new THREE.CylinderGeometry(.5, .5, 1, sides), position, scale, rotation));
}

function cone(parts: Primitive[], position: [number, number, number], scale: [number, number, number], rotation?: [number, number, number]) {
  parts.push(transformed(new THREE.ConeGeometry(.5, 1, 6), position, scale, rotation));
}

function merge(parts: Primitive[]) {
  const normalized = parts.map((part) => {
    const geometry = part.index ? part.toNonIndexed() : part;
    geometry.deleteAttribute("uv");
    return geometry;
  });
  const result = mergeGeometries(normalized, false) ?? new THREE.BoxGeometry(1, 1, 1);
  result.computeVertexNormals();
  for (const part of new Set([...parts, ...normalized])) part.dispose();
  return result;
}

function buildHumanoid(body: Primitive[], accent: Primitive[], heavy: boolean) {
  box(body, [0, 1.05, 0], [heavy ? .9 : .62, .9, heavy ? .66 : .48]);
  sphere(body, [0, 1.75, 0], [.55, .55, .55]);
  cylinder(body, [-.23, .42, 0], [.24, .82, .24]);
  cylinder(body, [.23, .42, 0], [.24, .82, .24]);
  box(body, [0, 1.12, .48], [heavy ? .9 : .7, .26, .24]);
  box(accent, [.52, 1.1, 0], [.22, .24, 1.15], [Math.PI / 2, 0, 0]);
}

function buildQuadruped(body: Primitive[], accent: Primitive[], crawler = false) {
  sphere(body, [0, .68, 0], [1.25, .7, crawler ? 1.05 : .72]);
  sphere(body, [.78, .76, 0], [.62, .55, .55]);
  for (const x of [-.62, .5]) for (const z of [-.46, .46]) {
    cone(body, [x, .23, z], [.3, .75, .3], [0, 0, x < 0 ? -.28 : .28]);
  }
  cone(accent, [1.2, .82, -.26], [.16, .75, .16], [0, 0, -Math.PI / 2]);
  cone(accent, [1.2, .82, .26], [.16, .75, .16], [0, 0, -Math.PI / 2]);
}

function buildVehicle(body: Primitive[], accent: Primitive[], walker = false) {
  if (walker) {
    box(body, [0, 1.25, 0], [1.25, 1.05, .9]);
    for (const z of [-.42, .42]) {
      cylinder(body, [-.25, .48, z], [.35, 1.05, .35], [0, 0, -.16]);
      box(body, [-.08, .08, z], [.75, .2, .42]);
    }
    box(accent, [.48, 1.42, 0], [.9, .32, .38]);
  } else {
    box(body, [0, .48, 0], [1.75, .62, 1.18]);
    box(body, [0, .75, 0], [.88, .42, .8]);
    box(body, [0, .26, -.7], [1.65, .42, .28]);
    box(body, [0, .26, .7], [1.65, .42, .28]);
    cylinder(accent, [.88, .85, 0], [.18, 1.9, .18], [0, 0, -Math.PI / 2], 8);
  }
}

function buildAircraft(body: Primitive[], accent: Primitive[], capital: boolean) {
  const length = capital ? 2.6 : 1.6;
  box(body, [0, .22, 0], [length, .42, capital ? 1.08 : .58]);
  cone(body, [length * .58, .22, 0], [capital ? 1.1 : .68, .62, capital ? 1.15 : .72], [0, 0, -Math.PI / 2]);
  box(body, [-.15, .16, 0], [capital ? 1.5 : .9, .16, capital ? 2.4 : 1.8], [0, .08, 0]);
  box(accent, [.45, .42, 0], [capital ? 1.25 : .72, .16, .28]);
  for (const z of [-.45, .45]) cylinder(accent, [-length * .48, .18, z], [.22, .5, .22], [0, 0, Math.PI / 2], 8);
}

function buildTerranStructure(body: Primitive[], accent: Primitive[], command: boolean) {
  cylinder(body, [0, .45, 0], [command ? 2.7 : 2.2, .9, command ? 2.7 : 2.2], undefined, 8);
  box(body, [0, 1.05, 0], [command ? 1.7 : 1.35, .55, command ? 1.7 : 1.35]);
  for (const x of [-.78, .78]) for (const z of [-.78, .78]) box(body, [x, .34, z], [.5, .68, .5]);
  cylinder(accent, [0, 1.48, 0], [.55, .28, .55], undefined, 10);
  box(accent, [.72, 1.18, 0], [.85, .18, .28]);
}

function buildZergStructure(body: Primitive[], accent: Primitive[], tall: boolean) {
  sphere(body, [0, .45, 0], [2.3, .85, 2.3], 1);
  sphere(body, [0, tall ? 1.55 : 1, 0], [tall ? .7 : 1.3, tall ? 2.7 : 1.2, tall ? .7 : 1.3], 1);
  for (let index = 0; index < 6; index++) {
    const angle = index / 6 * Math.PI * 2;
    cone(accent, [Math.cos(angle) * 1.35, .72, Math.sin(angle) * 1.35], [.28, tall ? 1.65 : 1.1, .28], [0, 0, angle + Math.PI / 2]);
  }
  sphere(accent, [0, tall ? 1.9 : 1.05, 0], [.55, .55, .55], 1);
}

function buildProtossStructure(body: Primitive[], accent: Primitive[], pylon: boolean) {
  cylinder(body, [0, .35, 0], [2.2, .7, 2.2], undefined, 6);
  if (pylon) {
    cone(body, [0, 1.6, 0], [1.05, 3.1, 1.05]);
    sphere(accent, [0, 1.7, 0], [.62, 1.05, .62], 1);
  } else {
    for (let index = 0; index < 4; index++) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      cone(body, [Math.cos(angle) * 1.05, 1.05, Math.sin(angle) * 1.05], [.48, 2.15, .48], [0, 0, -angle]);
    }
    sphere(accent, [0, 1.25, 0], [1.05, .55, 1.05], 1);
  }
}

function modelGeometry(type: string) {
  const key = canonicalSc2Type(type);
  const cached = modelCache.get(key);
  if (cached) return cached;
  const asset = sc2ModelAsset(key);
  const body: Primitive[] = [];
  const accent: Primitive[] = [];

  if (asset.shape === "humanoid" || asset.shape === "heavy-humanoid") buildHumanoid(body, accent, asset.shape === "heavy-humanoid");
  else if (asset.shape === "quadruped" || asset.shape === "crawler") buildQuadruped(body, accent, asset.shape === "crawler");
  else if (asset.shape === "tank" || asset.shape === "bike") buildVehicle(body, accent, false);
  else if (asset.shape === "walker") buildVehicle(body, accent, true);
  else if (asset.shape === "fighter" || asset.shape === "gunship" || asset.shape === "capital") buildAircraft(body, accent, asset.shape === "capital");
  else if (asset.shape.startsWith("terran-")) buildTerranStructure(body, accent, asset.shape === "terran-command");
  else if (asset.shape.startsWith("zerg-")) buildZergStructure(body, accent, asset.shape === "zerg-spire" || /hive|nydus/.test(key));
  else if (asset.shape.startsWith("protoss-")) buildProtossStructure(body, accent, asset.shape === "protoss-pylon");
  else if (asset.shape === "mineral") {
    for (const offset of [-.48, 0, .48]) cone(body, [offset, .62 + Math.abs(offset) * .25, 0], [.55, 1.5 - Math.abs(offset), .55]);
    sphere(accent, [0, .85, 0], [.42, .7, .42]);
  } else if (asset.shape === "gas") {
    cylinder(body, [0, .28, 0], [1.8, .55, 1.8], undefined, 10);
    for (let index = 0; index < 5; index++) sphere(accent, [Math.cos(index) * .65, .8 + index * .08, Math.sin(index) * .65], [.42, .7, .42]);
  } else if (asset.shape === "orb" || asset.shape === "creep") {
    sphere(body, [0, .65, 0], [1.15, 1.15, 1.15], 1);
    sphere(accent, [.2, .78, -.28], [.55, .55, .55], 1);
  } else {
    box(body, [0, .5, 0], [1.4, 1, 1.4]);
    sphere(accent, [0, 1.1, 0], [.55, .55, .55]);
  }

  if (asset.detail === "blades") for (const z of [-.55, .55]) cone(accent, [.75, .78, z], [.18, 1.35, .18], [0, 0, -Math.PI / 2]);
  if (asset.detail === "cannon" && !/tank|thor|defense|fortress/.test(asset.shape + key)) cylinder(accent, [.78, .9, 0], [.18, 1.45, .18], [0, 0, -Math.PI / 2]);
  if (asset.detail === "engines") for (const z of [-.38, .38]) cylinder(accent, [-.75, .55, z], [.26, .65, .26], [0, 0, Math.PI / 2]);
  if (asset.detail === "energy") sphere(accent, [0, 1.05, 0], [.52, .52, .52], 1);
  if (asset.detail === "wings" && !["fighter", "gunship", "capital"].includes(asset.shape)) box(accent, [0, .7, 0], [1.2, .12, 2.6]);
  if (asset.detail === "claws" && !["quadruped", "crawler"].includes(asset.shape)) for (const z of [-.45, .45]) cone(accent, [.8, .6, z], [.18, .9, .18], [0, 0, -Math.PI / 2]);

  const footprintScale = { tiny: .58, small: .78, medium: 1, large: 1.32, massive: 1.68 }[asset.footprint];
  const result = { body: merge(body), accent: merge(accent) };
  result.body.scale(footprintScale, footprintScale, footprintScale);
  result.accent.scale(footprintScale, footprintScale, footprintScale);
  modelCache.set(key, result);
  return result;
}

type TerrainSampling = {
  heightAt: (x: number, y: number) => number;
  levelAt: (x: number, y: number) => number;
  rampAt: (x: number, y: number) => MapGeometry["ramps"][number] | null;
  rampHeightAt: (ramp: MapGeometry["ramps"][number], x: number, y: number) => number;
};

const CLIFF_HEIGHT = 3.2;

function terrainSampler(geometry: MapGeometry): TerrainSampling {
  const gridWidth = geometry.gridWidth ?? 0;
  const gridHeight = geometry.gridHeight ?? 0;
  const mapWidth = geometry.width ?? 0;
  const mapHeight = geometry.height ?? 0;
  const levels = decodeMapRle(geometry.cliffRle, gridWidth * gridHeight);
  let baseLevel = 255;
  for (const value of levels) if (value > 0 && value < baseLevel) baseLevel = value;
  if (baseLevel === 255) baseLevel = 0;
  const levelAt = (x: number, y: number) => {
    if (!gridWidth || !gridHeight || !mapWidth || !mapHeight) return 0;
    const column = Math.max(0, Math.min(gridWidth - 1, Math.floor(x / mapWidth * Math.max(1, gridWidth - 1))));
    const row = Math.max(0, Math.min(gridHeight - 1, Math.floor(y / mapHeight * Math.max(1, gridHeight - 1))));
    return levels[row * gridWidth + column] ?? baseLevel;
  };
  const rampAt = (x: number, y: number) => geometry.ramps.find((ramp) => {
    let angle = ramp.direction * Math.PI / 4;
    let along = (x - ramp.x) * Math.cos(angle) + (y - ramp.y) * Math.sin(angle);
    const plus = levelAt(ramp.x + Math.cos(angle) * 3, ramp.y + Math.sin(angle) * 3);
    const minus = levelAt(ramp.x - Math.cos(angle) * 3, ramp.y - Math.sin(angle) * 3);
    if (plus < minus) { angle += Math.PI; along *= -1; }
    const across = -(x - ramp.x) * Math.sin(angle) + (y - ramp.y) * Math.cos(angle);
    return Math.abs(along) <= 4 && Math.abs(across) <= 3.2;
  }) ?? null;
  const rampHeightAt = (ramp: MapGeometry["ramps"][number], x: number, y: number) => {
    const angle = ramp.direction * Math.PI / 4;
    let along = (x - ramp.x) * Math.cos(angle) + (y - ramp.y) * Math.sin(angle);
    const plus = levelAt(ramp.x + Math.cos(angle) * 3, ramp.y + Math.sin(angle) * 3);
    const minus = levelAt(ramp.x - Math.cos(angle) * 3, ramp.y - Math.sin(angle) * 3);
    if (plus < minus) along *= -1;
    const t = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp((along + 3.6) / 7.2, 0, 1), 0, 1);
    const low = Math.max(0, ramp.low - baseLevel) * CLIFF_HEIGHT;
    const high = Math.max(0, ramp.high - baseLevel) * CLIFF_HEIGHT;
    return THREE.MathUtils.lerp(low, high, t);
  };
  const heightAt = (x: number, y: number) => {
    const ramp = rampAt(x, y);
    return ramp ? rampHeightAt(ramp, x, y) : Math.max(0, levelAt(x, y) - baseLevel) * CLIFF_HEIGHT;
  };
  return { heightAt, levelAt, rampAt, rampHeightAt };
}

function ribbonGeometry(segments: number[], width: number) {
  const positions: number[] = [];
  for (let index = 0; index + 5 < segments.length; index += 6) {
    const ax = segments[index];
    const ay = segments[index + 1];
    const az = segments[index + 2];
    const bx = segments[index + 3];
    const by = segments[index + 4];
    const bz = segments[index + 5];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    const offsetX = -(bz - az) / length * width / 2;
    const offsetZ = (bx - ax) / length * width / 2;
    positions.push(
      ax + offsetX, ay, az + offsetZ,
      bx + offsetX, by, bz + offsetZ,
      bx - offsetX, by, bz - offsetZ,
      ax + offsetX, ay, az + offsetZ,
      bx - offsetX, by, bz - offsetZ,
      ax - offsetX, ay, az - offsetZ,
    );
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  result.computeVertexNormals();
  return result;
}

type TerrainPoint = [number, number];
type TerrainEdge = { a: TerrainPoint; b: TerrainPoint };

function terrainPointKey([x, y]: TerrainPoint) {
  return `${x},${y}`;
}

function terrainDistanceToSegment(point: TerrainPoint, start: TerrainPoint, end: TerrainPoint) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (!dx && !dy) return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  const ratio = THREE.MathUtils.clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  return (point[0] - start[0] - ratio * dx) ** 2 + (point[1] - start[1] - ratio * dy) ** 2;
}

function simplifyTerrainPath(points: TerrainPoint[], tolerance = 1.15): TerrainPoint[] {
  if (points.length <= 2) return points;
  let split = 0;
  let distance = 0;
  for (let index = 1; index < points.length - 1; index++) {
    const candidate = terrainDistanceToSegment(points[index], points[0], points[points.length - 1]);
    if (candidate > distance) { split = index; distance = candidate; }
  }
  if (distance <= tolerance ** 2) return [points[0], points[points.length - 1]];
  const left = simplifyTerrainPath(points.slice(0, split + 1), tolerance);
  const right = simplifyTerrainPath(points.slice(split), tolerance);
  return [...left.slice(0, -1), ...right];
}

function simplifyTerrainBoundary(points: TerrainPoint[], tolerance: number) {
  if (points.length < 5 || terrainPointKey(points[0]) !== terrainPointKey(points[points.length - 1])) return simplifyTerrainPath(points, tolerance);
  const ring = points.slice(0, -1);
  let split = 1;
  let distance = 0;
  for (let index = 1; index < ring.length; index++) {
    const candidate = (ring[index][0] - ring[0][0]) ** 2 + (ring[index][1] - ring[0][1]) ** 2;
    if (candidate > distance) { split = index; distance = candidate; }
  }
  const first = simplifyTerrainPath(ring.slice(0, split + 1), tolerance);
  const second = simplifyTerrainPath([...ring.slice(split), ring[0]], tolerance);
  return [...first.slice(0, -1), ...second];
}

function traceTerrainEdges(edges: TerrainEdge[], tolerance = 1.15) {
  const adjacency = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    for (const point of [edge.a, edge.b]) {
      const key = terrainPointKey(point);
      adjacency.set(key, [...(adjacency.get(key) ?? []), index]);
    }
  });
  const visited = new Uint8Array(edges.length);
  const paths: TerrainPoint[][] = [];
  const edgeOrder = edges.map((_, index) => index).sort((left, right) => {
    const score = (index: number) => Number((adjacency.get(terrainPointKey(edges[index].a))?.length ?? 0) !== 2) + Number((adjacency.get(terrainPointKey(edges[index].b))?.length ?? 0) !== 2);
    return score(right) - score(left);
  });
  for (const start of edgeOrder) {
    if (visited[start]) continue;
    visited[start] = 1;
    const path: TerrainPoint[] = [edges[start].a, edges[start].b];
    let previous = edges[start].a;
    let current = edges[start].b;
    for (let guard = 0; guard < edges.length && terrainPointKey(current) !== terrainPointKey(path[0]); guard++) {
      const candidates = (adjacency.get(terrainPointKey(current)) ?? []).filter((index) => !visited[index]);
      if (!candidates.length) break;
      const incomingX = current[0] - previous[0];
      const incomingY = current[1] - previous[1];
      candidates.sort((leftIndex, rightIndex) => {
        const next = (index: number) => terrainPointKey(edges[index].a) === terrainPointKey(current) ? edges[index].b : edges[index].a;
        const left = next(leftIndex);
        const right = next(rightIndex);
        return incomingX * (right[0] - current[0]) + incomingY * (right[1] - current[1]) - incomingX * (left[0] - current[0]) - incomingY * (left[1] - current[1]);
      });
      const nextIndex = candidates[0];
      const nextPoint = terrainPointKey(edges[nextIndex].a) === terrainPointKey(current) ? edges[nextIndex].b : edges[nextIndex].a;
      visited[nextIndex] = 1;
      previous = current;
      current = nextPoint;
      path.push(current);
    }
    if (path.length >= 2) paths.push(simplifyTerrainBoundary(path, tolerance));
  }
  return paths;
}

function traceTerrainContours(values: Uint8Array, width: number, height: number, mode: "levels" | "walkable") {
  const edges: TerrainEdge[] = [];
  const matches = (x: number, y: number, value: number) => x >= 0 && x < width && y >= 0 && y < height && values[y * width + x] === value;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const value = values[y * width + x];
    if (mode === "walkable" && value !== 1) continue;
    if (mode === "levels") {
      if (x + 1 < width && values[y * width + x + 1] !== value) edges.push({ a: [x + 1, y], b: [x + 1, y + 1] });
      if (y + 1 < height && values[(y + 1) * width + x] !== value) edges.push({ a: [x, y + 1], b: [x + 1, y + 1] });
    } else {
      if (!matches(x - 1, y, 1)) edges.push({ a: [x, y], b: [x, y + 1] });
      if (!matches(x + 1, y, 1)) edges.push({ a: [x + 1, y + 1], b: [x + 1, y] });
      if (!matches(x, y - 1, 1)) edges.push({ a: [x + 1, y], b: [x, y] });
      if (!matches(x, y + 1, 1)) edges.push({ a: [x, y + 1], b: [x + 1, y + 1] });
    }
  }
  return traceTerrainEdges(edges, mode === "levels" ? 1.05 : 1.35);
}

function curvedTerrainSegments(paths: TerrainPoint[][], scaleX: number, scaleY: number, heightAt: (x: number, y: number) => number, bounds: MapBounds) {
  const segments: number[] = [];
  for (const path of paths) {
    const points = path.map(([x, y]) => {
      const worldX = x * scaleX;
      const worldY = y * scaleY;
      return new THREE.Vector3(worldX, heightAt(worldX, worldY) + .115, worldY);
    });
    if (points.length < 2) continue;
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1];
      const b = points[index];
      const inside = (point: THREE.Vector3) => point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minY && point.z <= bounds.maxY;
      if (inside(a) && inside(b)) segments.push(...a.toArray(), ...b.toArray());
    }
  }
  return segments;
}

function createTerrain(geometry: MapGeometry, bounds: MapBounds, sampling: TerrainSampling) {
  const mapWidth = geometry.width ?? 0;
  const mapHeight = geometry.height ?? 0;
  const expectedPathing = mapWidth * mapHeight;
  const walkable = decodeMapRle(geometry.walkableRle, expectedPathing);
  const gridWidth = geometry.gridWidth ?? 0;
  const gridHeight = geometry.gridHeight ?? 0;
  const cliffLevels = decodeMapRle(geometry.cliffRle, gridWidth * gridHeight);
  const root = new THREE.Group();
  root.name = "terrain-root";

  const topPositions: number[] = [];
  const topColors: number[] = [];
  const wallPositions: number[] = [];
  const topColor = new THREE.Color();
  const minX = Math.max(0, Math.floor(bounds.minX));
  const maxX = Math.min(mapWidth, Math.ceil(bounds.maxX));
  const minY = Math.max(0, Math.floor(bounds.minY));
  const maxY = Math.min(mapHeight, Math.ceil(bounds.maxY));
  const cellHeight = (x: number, y: number) => sampling.heightAt(x + .5, y + .5);

  const pushTriangle = (target: number[], a: [number, number, number], b: [number, number, number], c: [number, number, number]) => target.push(...a, ...b, ...c);
  const pushQuad = (target: number[], a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]) => {
    pushTriangle(target, a, b, c);
    pushTriangle(target, a, c, d);
  };

  for (let y = minY; y < maxY; y++) for (let x = minX; x < maxX; x++) {
    const ramp = sampling.rampAt(x + .5, y + .5);
    const flatHeight = cellHeight(x, y);
    const cornerHeight = (cornerX: number, cornerY: number) => ramp ? sampling.rampHeightAt(ramp, cornerX, cornerY) : flatHeight;
    const h00 = cornerHeight(x, y);
    const h10 = cornerHeight(x + 1, y);
    const h11 = cornerHeight(x + 1, y + 1);
    const h01 = cornerHeight(x, y + 1);
    const corners: Array<[number, number, number]> = [[x, h00, y], [x + 1, h10, y], [x + 1, h11, y + 1], [x, h01, y + 1]];
    if (!ramp) {
      pushQuad(topPositions, corners[0], corners[3], corners[2], corners[1]);
      const heightTone = THREE.MathUtils.clamp(flatHeight / (CLIFF_HEIGHT * 2), 0, 1);
      topColor.set("#1d3b46");
      topColor.offsetHSL(-.005, -.03, heightTone * .025);
      for (let vertex = 0; vertex < 6; vertex++) topColors.push(topColor.r, topColor.g, topColor.b);
    }

    const neighbors = [
      { x: x - 1, y, a: corners[3], b: corners[0] },
      { x: x + 1, y, a: corners[1], b: corners[2] },
      { x, y: y - 1, a: corners[0], b: corners[1] },
      { x, y: y + 1, a: corners[2], b: corners[3] },
    ];
    for (const neighbor of neighbors) {
      const outside = neighbor.x < minX || neighbor.x >= maxX || neighbor.y < minY || neighbor.y >= maxY;
      const neighborHeight = outside ? -1.2 : cellHeight(neighbor.x, neighbor.y);
      const sameRamp = !outside && ramp && sampling.rampAt(neighbor.x + .5, neighbor.y + .5) === ramp;
      if (neighborHeight < flatHeight - .35 && !sameRamp) {
        const lowA: [number, number, number] = [neighbor.a[0], neighborHeight, neighbor.a[2]];
        const lowB: [number, number, number] = [neighbor.b[0], neighborHeight, neighbor.b[2]];
        pushQuad(wallPositions, neighbor.a, neighbor.b, lowB, lowA);
      }
    }
  }

  const topGeometry = new THREE.BufferGeometry();
  topGeometry.setAttribute("position", new THREE.Float32BufferAttribute(topPositions, 3));
  topGeometry.setAttribute("color", new THREE.Float32BufferAttribute(topColors, 3));
  topGeometry.computeVertexNormals();
  const topMesh = new THREE.Mesh(topGeometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
  topMesh.receiveShadow = true;
  root.add(topMesh);

  const rampSurfacePositions: number[] = [];
  for (const ramp of geometry.ramps) {
    const angle = ramp.direction * Math.PI / 4;
    const forward = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    const side = new THREE.Vector2(-forward.y, forward.x);
    const point = (along: number, across: number): [number, number, number] => {
      const x = ramp.x + forward.x * along + side.x * across;
      const y = ramp.y + forward.y * along + side.y * across;
      return [x, sampling.rampHeightAt(ramp, x, y) + .025, y];
    };
    for (let strip = 0; strip < 8; strip++) {
      const from = -4.05 + strip * 1.0125;
      const to = from + 1.0125;
      pushQuad(rampSurfacePositions, point(from, -3.3), point(from, 3.3), point(to, 3.3), point(to, -3.3));
    }
  }
  const rampSurfaceGeometry = new THREE.BufferGeometry();
  rampSurfaceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rampSurfacePositions, 3));
  rampSurfaceGeometry.computeVertexNormals();
  const rampSurface = new THREE.Mesh(rampSurfaceGeometry, new THREE.MeshBasicMaterial({
    color: "#1d3b46",
    side: THREE.DoubleSide,
  }));
  rampSurface.receiveShadow = true;
  root.add(rampSurface);

  const wallGeometry = new THREE.BufferGeometry();
  wallGeometry.setAttribute("position", new THREE.Float32BufferAttribute(wallPositions, 3));
  wallGeometry.computeVertexNormals();
  const walls = new THREE.Mesh(wallGeometry, new THREE.MeshBasicMaterial({ color: "#10262f", side: THREE.DoubleSide }));
  walls.receiveShadow = true;
  root.add(walls);

  const contourHeight = (x: number, y: number) => Math.max(
    sampling.heightAt(x - .38, y - .38),
    sampling.heightAt(x + .38, y - .38),
    sampling.heightAt(x - .38, y + .38),
    sampling.heightAt(x + .38, y + .38),
  );
  const cliffEdgePositions = curvedTerrainSegments(
    traceTerrainContours(cliffLevels, gridWidth, gridHeight, "levels"),
    mapWidth / Math.max(1, gridWidth),
    mapHeight / Math.max(1, gridHeight),
    contourHeight,
    bounds,
  );
  const pathEdgePositions = curvedTerrainSegments(
    traceTerrainContours(walkable, mapWidth, mapHeight, "walkable"),
    1,
    1,
    contourHeight,
    bounds,
  );
  root.add(new THREE.Mesh(
    ribbonGeometry(cliffEdgePositions, .18),
    new THREE.MeshBasicMaterial({ color: "#7fc2d0", transparent: true, opacity: .7, depthWrite: false, side: THREE.DoubleSide }),
  ));
  root.add(new THREE.Mesh(
    ribbonGeometry(pathEdgePositions, .12),
    new THREE.MeshBasicMaterial({ color: "#8bd0de", transparent: true, opacity: .58, depthWrite: false, side: THREE.DoubleSide }),
  ));

  const borderPoints = [
    new THREE.Vector3(minX, sampling.heightAt(minX + .5, minY + .5) + .08, minY),
    new THREE.Vector3(maxX, sampling.heightAt(maxX - .5, minY + .5) + .08, minY),
    new THREE.Vector3(maxX, sampling.heightAt(maxX - .5, maxY - .5) + .08, maxY),
    new THREE.Vector3(minX, sampling.heightAt(minX + .5, maxY - .5) + .08, maxY),
  ];
  const borderSegments: number[] = [];
  for (let index = 0; index < borderPoints.length; index++) {
    const a = borderPoints[index];
    const b = borderPoints[(index + 1) % borderPoints.length];
    borderSegments.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  root.add(new THREE.Mesh(
    ribbonGeometry(borderSegments, .42),
    new THREE.MeshBasicMaterial({ color: "#91e0e8", transparent: true, opacity: .84, depthWrite: false, side: THREE.DoubleSide }),
  ));

  const rampMaterial = new THREE.MeshBasicMaterial({ color: "#d5fbff", transparent: true, opacity: .76, depthWrite: false, side: THREE.DoubleSide });
  for (const ramp of geometry.ramps) {
    const angle = ramp.direction * Math.PI / 4;
    const forward = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    const side = new THREE.Vector2(-forward.y, forward.x);
    const rampLines: number[] = [];
    for (const offset of [-2.4, 0, 2.4]) {
      for (const along of [-1.7, 0, 1.7]) {
        const centerX = ramp.x + side.x * offset + forward.x * along;
        const centerY = ramp.y + side.y * offset + forward.y * along;
        const h = sampling.heightAt(centerX, centerY) + .09;
        rampLines.push(centerX - forward.x * .55, h, centerY - forward.y * .55, centerX + forward.x * .55, h + .02, centerY + forward.y * .55);
      }
    }
    root.add(new THREE.Mesh(ribbonGeometry(rampLines, .28), rampMaterial));
  }

  const fixtureMaterial = new THREE.MeshStandardMaterial({ color: "#574b3e", roughness: .96, metalness: .04 });
  for (const item of geometry.staticObjects) {
    const fixture = new THREE.Mesh(new THREE.DodecahedronGeometry(/tower|rock/i.test(item.type) ? 2.2 : 1.35, 0), fixtureMaterial);
    fixture.position.set(item.x, sampling.heightAt(item.x, item.y) + 1.15, item.y);
    fixture.rotation.y = item.rotation;
    fixture.scale.y = .72;
    fixture.castShadow = true;
    root.add(fixture);
  }
  return root;
}

export const Sc2World3D = memo(function Sc2World3D({ bounds, geometry, onSelect, rotation, selectedUnitId, showTerrain, units, zoom }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const worldRef = useRef<THREE.Group | null>(null);
  const terrainRef = useRef<THREE.Object3D | null>(null);
  const unitRootRef = useRef<THREE.Group | null>(null);
  const unitsRef = useRef(units);
  const selectedUnitIdRef = useRef(selectedUnitId);
  const picksRef = useRef<BatchPick[]>([]);
  const renderRef = useRef<() => void>(() => undefined);
  const matrixUpdateRef = useRef<(blend: number, force?: boolean) => boolean>(() => false);
  const targetUnitsRef = useRef(new Map<number, WorldUnit>());
  const displayedTransformsRef = useRef(new Map<number, DisplayedTransform>());
  const motionDirtyRef = useRef(false);
  const terrainSampling = useMemo(() => terrainSampler(geometry), [geometry]);
  unitsRef.current = units;
  selectedUnitIdRef.current = selectedUnitId;
  const unitStructureRevision = units.map((unit) => `${unit.id}:${unit.type}:${unit.completed}:${unit.color}:${unit.race ?? "neutral"}`).join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x050c12, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.58;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x071018, .0028);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 1600);
    const world = new THREE.Group();
    const unitRoot = new THREE.Group();
    const terrain = createTerrain(geometry, bounds, terrainSampling);
    world.add(terrain, unitRoot);
    scene.add(world);

    scene.add(new THREE.HemisphereLight(0xb9edff, 0x0c1720, 2.35));
    const keyLight = new THREE.DirectionalLight(0xd9f7ff, 2.8);
    keyLight.position.set(bounds.minX - 80, 140, bounds.minY - 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x4a8cff, 1.1);
    rimLight.position.set(bounds.maxX, 80, bounds.maxY);
    scene.add(rimLight);

    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minY + bounds.maxY) / 2);
    const terrainLevels = decodeMapRle(geometry.cliffRle, (geometry.gridWidth ?? 0) * (geometry.gridHeight ?? 0));
    let lowestLevel = 255;
    let highestLevel = 0;
    for (const level of terrainLevels) if (level > 0) {
      lowestLevel = Math.min(lowestLevel, level);
      highestLevel = Math.max(highestLevel, level);
    }
    const terrainCeiling = lowestLevel === 255 ? 3 : Math.max(3, (highestLevel - lowestLevel) * CLIFF_HEIGHT + 3);
    camera.position.set(center.x - span * .92, span * .92, center.z - span * .92);
    camera.lookAt(center.x, 0, center.z);

    const render = () => renderer.render(scene, camera);
    renderRef.current = render;
    const matrixDummy = new THREE.Object3D();
    matrixUpdateRef.current = (blend, force = false) => {
      let pending = false;
      for (const batch of picksRef.current) {
        let touched = force;
        batch.ids.forEach((id, index) => {
          const unit = targetUnitsRef.current.get(id);
          if (!unit) return;
          const current = displayedTransformsRef.current.get(id) ?? { x: unit.x, y: unit.y, heading: unit.heading };
          displayedTransformsRef.current.set(id, current);
          const headingDelta = ((unit.heading - current.heading + 540) % 360) - 180;
          const deltaX = unit.x - current.x;
          const deltaY = unit.y - current.y;
          const changed = Math.abs(deltaX) > .002 || Math.abs(deltaY) > .002 || Math.abs(headingDelta) > .05;
          if (changed) {
            current.x += deltaX * blend;
            current.y += deltaY * blend;
            current.heading += headingDelta * blend;
            pending = true;
          }
          if (!force && !changed) return;
          touched = true;
          const asset = sc2ModelAsset(unit.type);
          const elevation = asset.elevation === "high-air" ? 8 : asset.elevation === "air" ? 5 : asset.elevation === "hover" ? 1.3 : 0;
          matrixDummy.position.set(current.x, terrainSampling.heightAt(current.x, current.y) + elevation + .08, current.y);
          matrixDummy.rotation.set(0, -current.heading * Math.PI / 180, 0);
          matrixDummy.scale.setScalar(unit.id === selectedUnitIdRef.current ? 1.18 : 1);
          matrixDummy.updateMatrix();
          for (const mesh of batch.meshes) mesh.setMatrixAt(index, matrixDummy.matrix);
        });
        if (!touched) continue;
        for (const mesh of batch.meshes) mesh.instanceMatrix.needsUpdate = true;
        if (force) batch.meshes[0].computeBoundingSphere();
      }
      return pending;
    };

    let animationFrame = 0;
    let previousMotionFrame = performance.now();
    const animateMotion = (now: number) => {
      if (motionDirtyRef.current && now - previousMotionFrame >= 1000 / 30) {
        const elapsed = Math.min(.1, (now - previousMotionFrame) / 1000);
        previousMotionFrame = now;
        const blend = 1 - Math.exp(-elapsed / .055);
        motionDirtyRef.current = matrixUpdateRef.current(blend);
        render();
      }
      animationFrame = window.requestAnimationFrame(animateMotion);
    };
    animationFrame = window.requestAnimationFrame(animateMotion);
    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const aspect = width / height;
      const halfSpan = span / 2;
      const fitPoints: THREE.Vector3[] = [];
      for (const x of [center.x - halfSpan, center.x + halfSpan]) {
        for (const y of [-1.5, terrainCeiling]) {
          for (const z of [center.z - halfSpan, center.z + halfSpan]) fitPoints.push(new THREE.Vector3(x, y, z));
        }
      }
      camera.updateMatrixWorld(true);
      let halfViewWidth = 0;
      let halfViewHeight = 0;
      for (const point of fitPoints) {
        point.applyMatrix4(camera.matrixWorldInverse);
        halfViewWidth = Math.max(halfViewWidth, Math.abs(point.x));
        halfViewHeight = Math.max(halfViewHeight, Math.abs(point.y));
      }
      const viewHeight = Math.max(halfViewHeight * 2, halfViewWidth * 2 / aspect) * 1.06;
      const viewWidth = viewHeight * width / height;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    worldRef.current = world;
    terrainRef.current = terrain;
    unitRootRef.current = unitRoot;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const pickMeshes = picksRef.current.flatMap((batch) => batch.meshes);
      const hit = raycaster.intersectObjects(pickMeshes, false)[0];
      if (!hit || hit.instanceId == null) return;
      const batch = picksRef.current.find((candidate) => candidate.meshes.includes(hit.object as THREE.InstancedMesh));
      const id = batch?.ids[hit.instanceId];
      if (id != null) onSelect(id);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (!modelCacheHas(object.geometry)) object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      matrixUpdateRef.current = () => false;
    };
  }, [bounds, geometry, onSelect, terrainSampling]);

  useEffect(() => {
    if (terrainRef.current) terrainRef.current.visible = showTerrain;
    renderRef.current();
  }, [showTerrain]);

  useEffect(() => {
    if (!worldRef.current) return;
    worldRef.current.rotation.y = -rotation * Math.PI / 2;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    worldRef.current.position.set(centerX, 0, centerY);
    worldRef.current.children.forEach((child) => child.position.set(-centerX, 0, -centerY));
    renderRef.current();
  }, [bounds, rotation]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    renderRef.current();
  }, [zoom]);

  useEffect(() => {
    const root = unitRootRef.current;
    if (!root) return;
    root.clear();
    picksRef.current = [];
    const batches = new Map<string, WorldUnit[]>();
    for (const unit of unitsRef.current.slice(0, 1000)) {
      const key = `${canonicalSc2Type(unit.type)}:${unit.color}:${unit.race ?? "neutral"}:${unit.completed}`;
      const batch = batches.get(key);
      if (batch) batch.push(unit); else batches.set(key, [unit]);
    }
    for (const batch of batches.values()) {
      const first = batch[0];
      const model = modelGeometry(first.type);
      const color = new THREE.Color(first.color);
      const race = first.race?.toLowerCase();
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: race === "protoss" ? color.clone().lerp(new THREE.Color("#d0a94c"), .3) : race === "zerg" ? color.clone().lerp(new THREE.Color("#67306f"), .24) : color.clone().lerp(new THREE.Color("#71838d"), .24),
        roughness: race === "zerg" ? .78 : .46,
        metalness: race === "zerg" ? .04 : .64,
        transparent: !first.completed,
        opacity: first.completed ? 1 : .48,
      });
      const accentMaterial = new THREE.MeshStandardMaterial({
        color: race === "zerg" ? "#9bc47b" : race === "protoss" ? "#d9bd66" : "#b7d4dc",
        emissive: color,
        emissiveIntensity: selectedUnitId != null && batch.some((unit) => unit.id === selectedUnitId) ? 2.4 : .72,
        roughness: .28,
        metalness: .4,
      });
      const bodyMesh = new THREE.InstancedMesh(model.body, bodyMaterial, batch.length);
      const accentMesh = new THREE.InstancedMesh(model.accent, accentMaterial, batch.length);
      const pickMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(first.isBuilding ? 3.1 : 1.25, 8, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
        batch.length,
      );
      pickMesh.userData.transientGeometry = true;
      bodyMesh.frustumCulled = false;
      accentMesh.frustumCulled = false;
      pickMesh.frustumCulled = false;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      accentMesh.castShadow = true;
      root.add(bodyMesh, accentMesh, pickMesh);
      picksRef.current.push({ ids: batch.map((unit) => unit.id), meshes: [pickMesh, bodyMesh, accentMesh] });
    }
    return () => {
      for (const child of [...root.children]) {
        if (child instanceof THREE.InstancedMesh) {
          if (child.userData.transientGeometry) child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
      }
    };
  }, [selectedUnitId, unitStructureRevision]);

  useEffect(() => {
    const targets = new Map(unitsRef.current.map((unit) => [unit.id, unit]));
    targetUnitsRef.current = targets;
    for (const unit of targets.values()) {
      if (!displayedTransformsRef.current.has(unit.id)) displayedTransformsRef.current.set(unit.id, { x: unit.x, y: unit.y, heading: unit.heading });
    }
    for (const id of displayedTransformsRef.current.keys()) if (!targets.has(id)) displayedTransformsRef.current.delete(id);
    matrixUpdateRef.current(0, true);
    renderRef.current();
    motionDirtyRef.current = true;
  }, [selectedUnitId, units]);

  return <div ref={hostRef} className="sc2-world-3d" style={{ transform: `scale(${1 / zoom})` }} data-terrain-mesh="plateaus-cliffs-2" aria-label="Cena 3D do replay" />;
});

function modelCacheHas(geometry: THREE.BufferGeometry) {
  for (const model of modelCache.values()) if (model.body === geometry || model.accent === geometry) return true;
  return false;
}
