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
