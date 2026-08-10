import assert from "node:assert/strict";
import test from "node:test";

import type { MapGeometry } from "./map-projection.ts";
import { createTerrainNavigator } from "./terrain-navigation.ts";

function rle(values: number[]) {
  const encoded: number[] = [];
  for (const value of values) {
    if (encoded.length && encoded.at(-2) === value) encoded[encoded.length - 1] += 1;
    else encoded.push(value, 1);
  }
  return encoded;
}

test("cross-cliff interpolation follows the walkable ramp instead of cutting the wall", () => {
  const width = 7, height = 5;
  const walkable = Array(width * height).fill(1);
  for (let y = 0; y < height - 1; y += 1) walkable[y * width + 3] = 0;
  const cliffs = Array.from({ length: width * height }, (_, index) => index % width < 4 ? 1 : 2);
  const geometry = {
    source: "s2ma", width, height, gridWidth: width, gridHeight: height,
    walkableRle: rle(walkable), cliffRle: rle(cliffs), buildableRle: [], clearanceRle: [], ramps: [], staticObjects: [],
  } as unknown as MapGeometry;
  const navigator = createTerrainNavigator(geometry)!;

  const halfway = navigator.pointBetween({ x: 1.5, y: 1.5 }, { x: 5.5, y: 1.5 }, .5);

  assert.ok(halfway.y > 3, `expected route through the lower gap, got y=${halfway.y}`);
});

test("same-level interpolation remains linear", () => {
  const geometry = {
    source: "s2ma", width: 4, height: 4, gridWidth: 4, gridHeight: 4,
    walkableRle: [1, 16], cliffRle: [1, 16], buildableRle: [], clearanceRle: [], ramps: [], staticObjects: [],
  } as unknown as MapGeometry;
  const navigator = createTerrainNavigator(geometry)!;

  assert.deepEqual(navigator.pointBetween({ x: 0, y: 0 }, { x: 2, y: 2 }, .25), { x: .5, y: .5 });
});

test("rejects implausibly long routes caused by sparse tracker corrections", () => {
  const width = 12, height = 12;
  const walkable = Array(width * height).fill(1);
  for (let y = 0; y < height - 1; y += 1) walkable[y * width + 3] = 0;
  const cliffs = Array.from({ length: width * height }, (_, index) => index % width < 4 ? 1 : 2);
  const geometry = {
    source: "s2ma", width, height, gridWidth: width, gridHeight: height,
    walkableRle: rle(walkable), cliffRle: rle(cliffs), buildableRle: [], clearanceRle: [], ramps: [], staticObjects: [],
  } as unknown as MapGeometry;
  const navigator = createTerrainNavigator(geometry)!;

  assert.deepEqual(navigator.pointBetween({ x: 2.5, y: .5 }, { x: 4.5, y: .5 }, .5), { x: 3.5, y: .5 });
});
