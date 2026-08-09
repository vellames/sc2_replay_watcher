import assert from "node:assert/strict";
import test from "node:test";

import { engagementLossAt } from "./engagement-progress.ts";
import type { ReplayDeath, ReplayEngagement } from "./types.ts";

const engagement: ReplayEngagement = {
  id: "engagement-1",
  start: 100,
  end: 110,
  x: 50,
  y: 50,
  participants: [1, 2],
  losses: { "1": 150, "2": 250 },
  unitsLost: { "1": 1, "2": 2 },
  winnerId: 1,
};

const deaths: ReplayDeath[] = [
  { id: 1, type: "Marine", ownerId: 1, x: 50, y: 50, time: 101, mineralCost: 50, vespeneCost: 0, supplyCost: 1 },
  { id: 2, type: "Marauder", ownerId: 2, x: 52, y: 50, time: 105, mineralCost: 100, vespeneCost: 25, supplyCost: 2 },
  { id: 2, type: "Marauder", ownerId: 2, x: 52, y: 50, time: 105, mineralCost: 100, vespeneCost: 25, supplyCost: 2 },
];

test("does not reveal engagement losses before they happen", () => {
  assert.equal(engagementLossAt(engagement, deaths, 99), 0);
  assert.equal(engagementLossAt(engagement, deaths, 100), 0);
});

test("accumulates only observed, unique deaths while combat is active", () => {
  assert.equal(engagementLossAt(engagement, deaths, 102), 50);
  assert.equal(engagementLossAt(engagement, deaths, 106), 175);
});

test("uses the authoritative aggregate once combat is complete", () => {
  assert.equal(engagementLossAt(engagement, deaths, 110), 400);
});
