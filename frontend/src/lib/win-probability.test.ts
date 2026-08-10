import assert from "node:assert/strict";
import test from "node:test";

import { latestProbabilityPoint, nearestProbabilityPoint, probabilityWindow } from "./win-probability.ts";

const points = [
  { time: 9.75, playerOne: 0.45, playerTwo: 0.55 },
  { time: 10, playerOne: 0.48, playerTwo: 0.52 },
  { time: 10.25, playerOne: 0.51, playerTwo: 0.49 },
  { time: 10.5, playerOne: 0.58, playerTwo: 0.42 },
  { time: 10.75, playerOne: 0.55, playerTwo: 0.45 },
];

test("clips probabilities to an engagement with causal boundary samples", () => {
  assert.deepEqual(probabilityWindow(points, 10.1, 10.6), [
    { time: 10.1, playerOne: 0.48, playerTwo: 0.52 },
    { time: 10.25, playerOne: 0.51, playerTwo: 0.49 },
    { time: 10.5, playerOne: 0.58, playerTwo: 0.42 },
    { time: 10.6, playerOne: 0.58, playerTwo: 0.42 },
  ]);
});

test("returns no graph when the series has not reached the engagement", () => {
  assert.deepEqual(probabilityWindow(points, 5, 6), []);
});

test("finds the closest probability sample for graph interaction", () => {
  assert.equal(nearestProbabilityPoint(points, 10.14)?.time, 10.25);
  assert.equal(nearestProbabilityPoint(points, 10.08)?.time, 10);
  assert.equal(nearestProbabilityPoint(points, 99)?.time, 10.75);
  assert.equal(nearestProbabilityPoint([], 10), null);
});

test("holds the latest causal sample and reaches an irregular final tick", () => {
  assert.equal(latestProbabilityPoint(points, 10.24)?.time, 10);
  assert.equal(latestProbabilityPoint(points, 10.75)?.time, 10.75);
  assert.equal(latestProbabilityPoint(points, 99)?.time, 10.75);
  assert.equal(latestProbabilityPoint([], 10), null);
});
