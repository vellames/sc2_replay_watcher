import assert from "node:assert/strict";
import test from "node:test";

import { createIsometricProjection, playableBounds, projectedHeading, type MapGeometry } from "./map-projection.ts";

const geometry: MapGeometry = {
  source: "s2ma", width: 200, height: 200,
  playableMinX: 20, playableMaxX: 180, playableMinY: 30, playableMaxY: 170,
  gridWidth: 2, gridHeight: 2, cliffRle: [1, 2, 3, 2], walkableRle: [], buildableRle: [], clearanceRle: [], ramps: [], staticObjects: [],
};

test("uses official playable bounds for reconstructed maps", () => {
  assert.deepEqual(playableBounds(geometry, { minX: 0, maxX: 1, minY: 0, maxY: 1 }), { minX: 20, maxX: 180, minY: 30, maxY: 170 });
});

test("projects map corners into a stable isometric diamond", () => {
  const bounds = playableBounds(geometry, { minX: 0, maxX: 200, minY: 0, maxY: 200 });
  const { project } = createIsometricProjection(geometry, bounds);
  const south = project(bounds.minX, bounds.minY, 1);
  const east = project(bounds.maxX, bounds.minY, 1);
  const north = project(bounds.maxX, bounds.maxY, 1);
  assert.ok(south.left > 40 && south.left < 55);
  assert.ok(east.left > south.left);
  assert.ok(north.bottom > east.bottom);
});

test("raises higher terrain without shifting its horizontal position", () => {
  const bounds = playableBounds(geometry, { minX: 0, maxX: 200, minY: 0, maxY: 200 });
  const { project } = createIsometricProjection(geometry, bounds);
  const low = project(100, 100, 1);
  const high = project(100, 100, 3);
  assert.equal(high.left, low.left);
  assert.ok(high.bottom > low.bottom);
});

test("preserves world scale when playable bounds are rectangular", () => {
  const wideBounds = { minX: 0, maxX: 160, minY: 0, maxY: 80 };
  const wideGeometry = { ...geometry, playableMinX: 0, playableMaxX: 160, playableMinY: 0, playableMaxY: 80 };
  const { project } = createIsometricProjection(wideGeometry, wideBounds);
  const origin = project(0, 0, 1);
  const horizontal = project(160, 0, 1);
  const vertical = project(0, 80, 1);
  assert.equal(Math.round(Math.abs(horizontal.left - origin.left)), Math.round(Math.abs(vertical.left - origin.left) * 2));
});

test("rotates every world point through the same isometric projection", () => {
  const bounds = playableBounds(geometry, { minX: 0, maxX: 200, minY: 0, maxY: 200 });
  const original = createIsometricProjection(geometry, bounds, 0).project(bounds.maxX, bounds.minY, 1);
  const rotated = createIsometricProjection(geometry, bounds, 1).project(bounds.maxX, bounds.minY, 1);
  assert.notDeepEqual(rotated, original);
  assert.ok(rotated.bottom > original.bottom);
});

test("projects unit heading together with map rotation", () => {
  const bounds = playableBounds(geometry, { minX: 0, maxX: 200, minY: 0, maxY: 200 });
  const originalProjection = createIsometricProjection(geometry, bounds, 0).project;
  const rotatedProjection = createIsometricProjection(geometry, bounds, 1).project;
  const original = projectedHeading(originalProjection, 100, 100, 0);
  const rotated = projectedHeading(rotatedProjection, 100, 100, 0);
  assert.ok(Math.abs(original - rotated) > 40);
});
