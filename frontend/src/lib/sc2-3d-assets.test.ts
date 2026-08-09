import assert from "node:assert/strict";
import test from "node:test";

import { hasDedicatedSc2Model, sc2AttackVisual, sc2ModelAsset } from "./sc2-3d-assets.ts";

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

test("assigns restrained combat signatures and engagement ranges", () => {
  assert.deepEqual(sc2AttackVisual("Zergling"), { kind: "contact", range: 3.5 });
  assert.deepEqual(sc2AttackVisual("SiegeTankSieged"), { kind: "shell", range: 14 });
  assert.equal(sc2AttackVisual("VoidRay").kind, "beam");
  assert.equal(sc2AttackVisual("Marauder").kind, "missile");
  assert.equal(sc2AttackVisual("Marine").kind, "rifle");
});

test("recognizes neutral map fixtures instead of inventing faction structures", () => {
  assert.equal(sc2ModelAsset("XelNagaTower").shape, "neutral-tower");
  assert.equal(sc2ModelAsset("XelNagaTowerRangeIndicatorDummy").shape, "neutral-tower");
  assert.equal(sc2ModelAsset("CollapsibleRockTower").shape, "neutral-rock");
  assert.equal(hasDedicatedSc2Model("DestructibleDebris6x6"), true);
});

test("covers the complete core LotV unit and structure inventory", () => {
  const terran = [
    "SCV", "MULE", "Marine", "Marauder", "Reaper", "Ghost", "Hellion", "HellionTank", "WidowMine", "SiegeTank", "Cyclone", "Thor", "VikingFighter", "Medivac", "Liberator", "Raven", "Banshee", "Battlecruiser", "AutoTurret", "KD8Charge",
    "CommandCenter", "OrbitalCommand", "PlanetaryFortress", "SupplyDepot", "Refinery", "Barracks", "Factory", "Starport", "EngineeringBay", "Armory", "FusionCore", "GhostAcademy", "Bunker", "MissileTurret", "SensorTower", "TechLab", "Reactor",
  ];
  const zerg = [
    "Drone", "Zergling", "Baneling", "Queen", "Roach", "Ravager", "Hydralisk", "LurkerMP", "Infestor", "SwarmHostMP", "Ultralisk", "Mutalisk", "Corruptor", "BroodLord", "Viper", "Overlord", "Overseer", "ChangelingZealot", "Broodling", "Larva", "LocustMP", "Egg", "RavagerCocoon", "BroodLordCocoon",
    "Hatchery", "Lair", "Hive", "Extractor", "SpawningPool", "RoachWarren", "BanelingNest", "EvolutionChamber", "HydraliskDen", "LurkerDenMP", "InfestationPit", "Spire", "GreaterSpire", "UltraliskCavern", "NydusNetwork", "NydusCanal", "SpineCrawler", "SporeCrawler", "CreepTumor",
  ];
  const protoss = [
    "Probe", "Zealot", "Stalker", "Sentry", "Adept", "HighTemplar", "DarkTemplar", "Archon", "Observer", "WarpPrism", "Immortal", "Colossus", "Disruptor", "Phoenix", "Oracle", "VoidRay", "Tempest", "Carrier", "Mothership", "Interceptor", "AdeptPhaseShift", "DisruptorPhased", "ForceField",
    "Nexus", "Pylon", "Assimilator", "Gateway", "WarpGate", "Forge", "CyberneticsCore", "TwilightCouncil", "TemplarArchive", "DarkShrine", "RoboticsFacility", "RoboticsBay", "Stargate", "FleetBeacon", "PhotonCannon", "ShieldBattery",
  ];
  const missing = [...terran, ...zerg, ...protoss].filter((type) => !hasDedicatedSc2Model(type));
  assert.deepEqual(missing, []);
});
