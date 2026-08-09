import assert from "node:assert/strict";
import test from "node:test";

import { hasDedicatedSc2Model, sc2ModelAsset } from "./sc2-3d-assets.ts";

test("canonicalizes Terran state variants to the same tactical asset", () => {
  assert.deepEqual(sc2ModelAsset("SiegeTankSieged"), sc2ModelAsset("SiegeTank"));
  assert.deepEqual(sc2ModelAsset("VikingAssault"), sc2ModelAsset("VikingFighter"));
  assert.deepEqual(sc2ModelAsset("LiberatorAG"), sc2ModelAsset("Liberator"));
});

test("distinguishes Terran silhouettes by gameplay role", () => {
  assert.equal(sc2ModelAsset("Marine").shape, "humanoid");
  assert.equal(sc2ModelAsset("SiegeTank").shape, "tank");
  assert.equal(sc2ModelAsset("Battlecruiser").shape, "capital");
  assert.equal(sc2ModelAsset("CommandCenter").shape, "terran-command");
});

test("marks catalog coverage without disguising fallback models", () => {
  assert.equal(hasDedicatedSc2Model("SCV"), true);
  assert.equal(hasDedicatedSc2Model("MineralField750"), true);
  assert.equal(hasDedicatedSc2Model("ImaginaryLotVUnit"), false);
  assert.equal(sc2ModelAsset("ImaginaryLotVUnit").shape, "fallback");
});

test("covers the distinct Zerg lifecycle and organic architecture", () => {
  assert.equal(sc2ModelAsset("Zergling").shape, "quadruped");
  assert.equal(sc2ModelAsset("Mutalisk").elevation, "air");
  assert.equal(sc2ModelAsset("Ultralisk").footprint, "massive");
  assert.equal(sc2ModelAsset("Hatchery").shape, "zerg-townhall");
  assert.equal(sc2ModelAsset("Spire").shape, "zerg-spire");
  assert.equal(sc2ModelAsset("CreepTumorQueen").shape, "creep");
});

test("covers Protoss energy, walkers and capital ships", () => {
  assert.equal(sc2ModelAsset("Zealot").detail, "blades");
  assert.equal(sc2ModelAsset("Stalker").shape, "quadruped");
  assert.equal(sc2ModelAsset("Colossus").footprint, "massive");
  assert.equal(sc2ModelAsset("Carrier").shape, "capital");
  assert.equal(sc2ModelAsset("Nexus").shape, "protoss-nexus");
  assert.equal(sc2ModelAsset("Pylon").shape, "protoss-pylon");
  assert.deepEqual(sc2ModelAsset("WarpPrismPhasing"), sc2ModelAsset("WarpPrism"));
});
