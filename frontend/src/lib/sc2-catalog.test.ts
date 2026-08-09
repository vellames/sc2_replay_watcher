import assert from "node:assert/strict";
import test from "node:test";

import { hasLocalizedSc2Name, sc2CategoryName, sc2IconKey, sc2Name } from "./sc2-catalog.ts";

test("localizes canonical LotV entities", () => {
  assert.equal(sc2Name("SiegeTank", "pt"), "Tanque de Cerco");
  assert.equal(sc2Name("SiegeTank", "en"), "Siege Tank");
  assert.equal(sc2Name("SpawningPool", "pt"), "Piscina de Desova");
});

test("collapses replay state variants into their base entity", () => {
  assert.equal(sc2Name("CommandCenterFlying", "pt"), "Centro de Comando");
  assert.equal(sc2Name("RoachBurrowed", "pt"), "Barata");
  assert.equal(sc2Name("SporeCrawlerUprooted", "en"), "Spore Crawler");
  assert.equal(sc2Name("ThorAP", "en"), "Thor");
});

test("normalizes internal aliases and upgrade levels", () => {
  assert.equal(sc2Name("main", "pt"), "Exército principal");
  assert.equal(sc2Name("PunisherGrenades", "pt"), "Projéteis Concussivos");
  assert.equal(sc2Name("TerranInfantryWeaponsLevel3", "pt"), "Armas de Infantaria Terrana 3");
  assert.equal(sc2Name("FlyerCarapace2", "en"), "Zerg Flyer Carapace 2");
});

test("keeps unknown future entities readable", () => {
  assert.equal(sc2Name("FutureLotVUnit", "pt"), "Future Lot VUnit");
  assert.equal(hasLocalizedSc2Name("FutureLotVUnit"), false);
  assert.equal(hasLocalizedSc2Name("BanelingBurrowed"), true);
});

test("localizes inspector categories", () => {
  assert.equal(sc2CategoryName("building", "pt"), "Estrutura");
  assert.equal(sc2CategoryName("worker", "en"), "Worker");
});

test("keeps tactical icon classification stable across contexts", () => {
  assert.equal(sc2IconKey("SiegeTankSieged"), "siege");
  assert.equal(sc2IconKey("Medivac"), "medic");
  assert.equal(sc2IconKey("OverseerSiegeMode"), "detector");
  assert.equal(sc2IconKey("BarracksFlying"), "production");
  assert.equal(sc2IconKey("MineralField750"), "resource");
});
