import assert from "node:assert/strict";
import test from "node:test";

import { probabilityWindow } from "./win-probability.ts";

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
