import assert from "node:assert/strict";
import test from "node:test";

import { playableBounds, projectedHeading, type MapGeometry } from "./map-projection.ts";

const geometry: MapGeometry = {
  source: "s2ma", width: 200, height: 200,
  playableMinX: 20, playableMaxX: 180, playableMinY: 30, playableMaxY: 170,
  gridWidth: 2, gridHeight: 2, cliffRle: [1, 2, 3, 2], walkableRle: [], buildableRle: [], clearanceRle: [], ramps: [], staticObjects: [],
};

test("keeps camera bounds when every observed entity is inside them", () => {
  assert.deepEqual(playableBounds(geometry, { minX: 40, maxX: 160, minY: 50, maxY: 150 }), { minX: 20, maxX: 180, minY: 30, maxY: 170 });
});

test("expands camera bounds to include recorded edge entities", () => {
  assert.deepEqual(playableBounds(geometry, { minX: 10, maxX: 190, minY: 25, maxY: 175 }), { minX: 10, maxX: 190, minY: 25, maxY: 175 });
});

test("projects unit heading in the tactical coordinate system", () => {
  const project = (x: number, y: number) => ({ left: x, bottom: y });

  assert.ok(Math.abs(projectedHeading(project, 100, 100, 0)) < .001);
  assert.equal(projectedHeading(project, 100, 100, 90), -90);
});
