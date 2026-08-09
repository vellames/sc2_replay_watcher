import { memo } from "react";

import { sc2ModelAsset, type Sc2ModelShape } from "@/lib/sc2-3d-assets";
import { canonicalSc2Type } from "@/lib/sc2-catalog";

type ShapeGeometry = { hull: string; inset?: string; hardpoint?: string; depth?: number };

const geometry: Record<Sc2ModelShape, ShapeGeometry> = {
  humanoid: { hull: "M16 4l4 5 4 2-2 5-3-2 2 12h-4l-1-7-1 7h-4l2-12-3 2-2-5 4-2z", inset: "M14 8h4l1 5-3 3-3-3z" },
  "heavy-humanoid": { hull: "M13 4h6l2 4 6 3-3 7-4-2 3 10h-5l-2-7-2 7H9l3-10-4 2-3-7 6-3z", inset: "M12 8h8l2 5-6 4-6-4z" },
  quadruped: { hull: "M7 12l6-7h7l5 7-3 5 5 7-4 2-6-6-2 6h-4l-2-7-5 5-3-2 6-8z", inset: "M12 9h7l3 4-6 5-6-5z" },
  crawler: { hull: "M4 16l6-7 5-3 7 3 6 7-6 1 4 7-4 2-6-7-2 8h-4l-1-8-6 6-3-2 5-7z", inset: "M10 12l6-4 7 5-3 7H9l-3-4z" },
  orb: { hull: "M16 4l8 5 4 8-4 8-8 4-8-4-4-8 4-8z", inset: "M16 8l5 3 2 6-3 5-4 3-5-3-2-5 2-6z" },
  tank: { hull: "M7 7h18l4 5-2 12-7 3H9l-6-3-1-12z", inset: "M9 10h14l2 5-3 7H9l-3-7z", hardpoint: "M14 12h5l1 5 9-2v3l-10 2-5-3z" },
  walker: { hull: "M10 5h12l4 7-3 7 5 6-3 3-7-7h-4l-7 7-3-3 5-6-3-7z", inset: "M11 9h10l2 5-4 5h-6l-4-5z" },
  bike: { hull: "M5 13l8-7h7l8 7-3 10-7 4H8L3 23z", inset: "M9 14l6-5 7 5-4 8h-7z" },
  mine: { hull: "M16 5l5 5 7 2-4 6 3 7-8-1-3 5-3-5-8 1 3-7-4-6 7-2z", inset: "M16 10l6 4-2 7-8 0-2-7z" },
  fighter: { hull: "M16 3l4 9 10 7-2 5-10-4-2 9-2-9-10 4-2-5 10-7z", inset: "M16 9l2 7 7 4-8-1-1 5-1-5-8 1 7-4z" },
  gunship: { hull: "M12 5h8l3 8 7 5-2 6-8-2-4 7-4-7-8 2-2-6 7-5z", inset: "M13 9h6l2 7 5 3-7-1-3 6-3-6-7 1 5-3z" },
  capital: { hull: "M16 2l5 8 8 5-3 10-8 1-2 6-2-6-8-1-3-10 8-5z", inset: "M16 7l3 7 6 3-2 5-7 2-7-2-2-5 6-3z", hardpoint: "M15 10h2v12h-2z" },
  "terran-command": { hull: "M6 7h20l4 7-2 12-8 5H10l-7-5-1-12z", inset: "M10 10h12l4 6-2 8-8 4-9-4-1-8z", hardpoint: "M13 13h6l3 5-3 5h-6l-3-5z", depth: 4.5 },
  "terran-production": { hull: "M4 9h21l5 6-3 13H7L2 23z", inset: "M8 12h13l5 5-3 8H9l-4-4z", hardpoint: "M9 7h4v7H9zm10-3h3v10h-3z", depth: 4 },
  "terran-tech": { hull: "M7 8h18l5 8-4 12H7L2 21z", inset: "M11 11h10l5 6-4 7H9l-3-5z", hardpoint: "M14 5h4v12h-4z", depth: 4 },
  "terran-defense": { hull: "M9 12l7-7 7 7 6 5-4 10H7L3 17z", inset: "M11 14l5-5 5 5 2 8H9z", hardpoint: "M14 12h5l1 5 9-3v3l-10 4-5-4z", depth: 4.5 },
  "terran-supply": { hull: "M5 11h22l3 7-4 9H6l-4-9z", inset: "M8 14h16l2 5-3 5H8l-2-5z", hardpoint: "M9 17h14v2H9z", depth: 1.5 },
  gas: { hull: "M10 8l6-4 7 4 5 9-3 10H8L4 17z", inset: "M13 10l4-2 4 3 2 8-4 5h-7l-3-5z", depth: 3.5 },
  "zerg-townhall": { hull: "M16 3l6 4 7 10-3 10-10 5-10-5-3-10L10 7z", depth: 4.5 },
  "zerg-organic": { hull: "M16 4l7 5 6 9-6 9-7 3-8-3-5-9 6-9z", depth: 3.8 },
  "zerg-spire": { hull: "M16 2l5 8 7 7-5 11-7 4-8-4-4-11 7-7z", depth: 4.5 },
  "zerg-defense": { hull: "M16 4l5 8 7 4-4 11-8 4-8-4-4-11 7-4z", depth: 4.2 },
  "protoss-nexus": { hull: "M16 2l6 7 7 8-4 10-9 5-9-5-4-10 7-8z", depth: 4.5 },
  "protoss-gateway": { hull: "M16 3l11 9 2 12-13 7L3 24l2-12z", depth: 4 },
  "protoss-tech": { hull: "M16 2l8 10 5 7-6 10H9L3 19l5-7z", depth: 4.2 },
  "protoss-defense": { hull: "M16 3l5 9 8 5-5 11-8 3-8-3-5-11 8-5z", depth: 4.5 },
  "protoss-pylon": { hull: "M16 1l7 12-3 16-4 3-4-3-3-16z", depth: 4 },
  "neutral-tower": { hull: "M13 3h6l3 12 6 7-5 8H9l-5-8 6-7z", inset: "M15 7h2l2 12-3 5-3-5z", depth: 4.5 },
  "neutral-rock": { hull: "M3 16l6-8 8-3 7 4 5 9-4 9-10 3-10-4-4-8z", inset: "M9 12l7-4 7 3 2 7-6 7-9-3-3-6z" },
  mineral: { hull: "M16 2l8 11-3 16H10L7 13z", inset: "M16 7l4 8-2 10h-5l-2-10z" },
  creep: { hull: "M16 7l6 4 6 6-5 8-7 3-8-3-4-8 6-6z" },
  fallback: { hull: "M16 4l12 9-3 13-9 5-10-5-2-13z", inset: "M16 9l7 6-2 8-5 3-6-3-1-8z" },
};

const details: Record<NonNullable<ReturnType<typeof sc2ModelAsset>["detail"]>, string> = {
  blades: "M8 8l3-1 5 12-2 1zm16 0l-3-1-5 12 2 1z",
  cannon: "M15 7h3v12l9-3v3l-10 4-3-4z",
  claws: "M5 9l3-2 6 9-2 2zm22 0l-3-2-6 9 2 2z",
  engines: "M8 23h5l-2 7zm11 0h5l-3 7z",
  energy: "M16 10l4 6-4 7-4-7z",
  wings: "M4 13l10 4-8 5zm24 0l-10 4 8 5z",
};

type ModelIdentity = { accent: string; cut?: string; lights?: Array<[number, number, number]> };

/*
 * Small, type-specific pieces are deliberately kept separate from the shared
 * chassis. A replay can contain hundreds of units, so a composed SVG model is
 * considerably cheaper than mounting a WebGL scene for every marker while it
 * still gives every LotV entity a recognisable silhouette at tactical zoom.
 */
const identities: Record<string, ModelIdentity> = {
  // Terran infantry and vehicles
  scv: { accent: "M8 13l5-5 3 3-5 7zm16 0l-5-5-3 3 5 7zM14 8h4v9h-4z", lights: [[16, 9, 1.2]] },
  mule: { accent: "M7 12h6v7H9zm12 0h6l-2 7h-4zM13 8h6v9h-6z", lights: [[16, 10, 1.4]] },
  marine: { accent: "M8 11l5-4 3 5-3 6-4-2zm11-1h3l6 5-1 2-8-3z", lights: [[15, 9, .8]] },
  marauder: { accent: "M6 10l7-4 3 6-4 6-6-3zm13-3l8 4-2 5-6 2-3-6zM13 19h6v6h-6z" },
  reaper: { accent: "M7 10l5-4 3 6-4 5-5-2zm12-3l7 4-2 5-5 1-3-5zM9 20h5l-4 9zm9 0h5l-1 9z", lights: [[16, 9, .8]] },
  ghost: { accent: "M10 8h6l2 6-5 4-4-4zm7 4l10-3 .5 2-10 4z", lights: [[15, 9, .7]] },
  hellion: { accent: "M5 14l8-6h7l7 6-4 2-5-4h-4l-5 4zM7 20h5v5H7zm13 0h5v5h-5z" },
  helliontank: { accent: "M7 9l6-4 3 6-4 7-6-2zm18 0l-6-4-3 6 4 7 6-2zM13 18h6v7h-6z" },
  widowmine: { accent: "M16 5l2 8 9 3-9 2-2 9-2-9-9-2 9-3z", lights: [[16, 16, 1.4]] },
  siegetank: { accent: "M7 11h15v10H7zM14 7h5v10l11-3v3l-12 4h-5z", lights: [[9, 15, .7], [22, 15, .7]] },
  cyclone: { accent: "M6 11h18l2 4-3 7H8l-2-7zM13 8h6v10h-6z", lights: [[9, 16, .8], [23, 16, .8]] },
  thor: { accent: "M7 8h7v10H7zm11 0h7v10h-7zM13 12h6v10h-6zM8 21h5l-3 7zm11 0h5l-2 7z", lights: [[10, 11, .8], [22, 11, .8]] },
  vikingfighter: { accent: "M16 4l3 11 11 6-11-3-3 11-3-11-11 3 11-6z" },
  medivac: { accent: "M12 7h8l2 10 8 3-10 2-4 7-4-7-10-2 8-3z", lights: [[16, 13, 1.2]] },
  liberator: { accent: "M16 4l4 10 10 5-9-1-5 10-5-10-9 1 10-5zM14 13h4v8h-4z" },
  raven: { accent: "M16 6l5 8 7 3-8 2-4 8-4-8-8-2 7-3z", lights: [[16, 16, 1.5]] },
  banshee: { accent: "M13 5h6l3 11 8 4-10 1-4 8-3-8-11-1 8-4z" },
  battlecruiser: { accent: "M16 2l5 12 9 5-10 3-4 10-4-10-10-3 9-5zM15 7h2v18h-2z", lights: [[16, 14, 1]] },

  // Zerg ground and air organisms
  drone: { accent: "M16 7l5 5-3 8-2 7-2-7-3-8zM11 13L4 9l5 7zm10 0l7-4-5 7z" },
  zergling: { accent: "M14 8l2 5 2-5 3 8-5 7-5-7zM11 12L4 7l5 9zm10 0l7-5-5 9z" },
  baneling: { accent: "M16 7l6 4 2 7-4 7h-8l-4-7 2-7z", lights: [[13, 15, 1.2], [19, 17, 1], [15, 21, .8]] },
  queen: { accent: "M16 5l5 8-2 8-3 7-3-7-2-8zM11 14L3 9l6 9zm10 0l8-5-6 9z" },
  roach: { accent: "M9 12l7-6 7 6-3 9-4 5-5-5zM10 15L4 12l5 7zm12 0l6-3-5 7z" },
  ravager: { accent: "M8 13l8-8 8 8-3 10-5 5-6-5z", lights: [[16, 11, 1.4], [13, 17, .8], [19, 17, .8]] },
  hydralisk: { accent: "M16 4l5 8-3 7-2 9-2-9-3-7zM11 12L5 8l4 9zm10 0l6-4-4 9z" },
  lurkermp: { accent: "M16 6l4 8-4 12-4-12zM12 12L3 7l6 12zm8 0l9-5-6 12zM10 19l-7 5 9-2zm12 0l7 5-9-2z" },
  infestor: { accent: "M9 15l7-8 7 8-2 8-5 4-5-4zM10 17L4 14l5 7zm12 0l6-3-5 7z", lights: [[16, 14, 1.2]] },
  swarmhostmp: { accent: "M7 15l9-9 9 9-3 9H10zM10 13l-7-3 6 8zm12 0l7-3-6 8z" },
  ultralisk: { accent: "M8 12l8-7 8 7-2 11-6 5-6-5zM11 13L2 7l7 13zm10 0l9-6-7 13z" },
  mutalisk: { accent: "M16 5l3 10 11-7-8 11 5 7-9-5-2 8-2-8-9 5 5-7-8-11 11 7z" },
  corruptor: { accent: "M16 6l5 8 8-5-5 10 3 7-8-5-3 8-3-8-8 5 3-7-5-10 8 5z" },
  broodlord: { accent: "M16 4l6 9 7-3-4 10 3 6-9-4-3 8-3-8-9 4 3-6-4-10 7 3z" },
  viper: { accent: "M16 4l4 10 9-5-6 10 4 7-9-5-2 9-2-9-9 5 4-7-6-10 9 5z" },
  overlord: { accent: "M16 5l7 6 2 9-5 7h-8l-5-7 2-9zM11 20L7 29m9-8v10m5-11l4 9" },
  overseer: { accent: "M16 4l7 7 2 9-5 7h-8l-5-7 2-9zM11 20L7 29m14-9l4 9", lights: [[16, 13, 1.6]] },

  // Protoss warriors and craft
  probe: { accent: "M16 5l6 7-2 9-4 6-4-6-2-9zM10 14L3 17l8 2zm12 0l7 3-8 2z", lights: [[16, 15, 1.6]] },
  zealot: { accent: "M16 5l5 6-3 8-2 8-2-8-3-8zM11 11L4 5l5 13zm10 0l7-6-5 13z", lights: [[16, 10, .8]] },
  stalker: { accent: "M16 6l5 7-2 7-3 6-3-6-2-7zM11 14L4 9l5 11zm10 0l7-5-5 11z", lights: [[16, 13, 1.2]] },
  sentry: { accent: "M16 6l7 7-2 9-5 5-5-5-2-9zM10 15l-6 4 7 1zm12 0l6 4-7 1z", lights: [[16, 15, 1.7]] },
  adept: { accent: "M16 5l5 7-3 8-2 7-2-7-3-8zM11 12L4 8l5 10zm10 0l7-4-5 10z", lights: [[16, 11, 1]] },
  hightemplar: { accent: "M16 4l6 8-3 9-3 8-3-8-3-9z", lights: [[16, 12, 1.5], [16, 19, .8]] },
  darktemplar: { accent: "M16 4l5 8-3 9-2 8-3-8-2-9zM11 11L3 6l6 13z", lights: [[16, 12, 1]] },
  archon: { accent: "M16 4l8 7 3 8-6 8H11l-6-8 3-8z", lights: [[16, 16, 3.2], [16, 16, 5.2]] },
  observer: { accent: "M16 7l4 7 9 3-9 2-4 8-4-8-9-2 9-3z", lights: [[16, 17, 1.6]] },
  warpprism: { accent: "M16 4l6 10 8 4-9 3-5 9-5-9-9-3 8-4z", lights: [[16, 16, 2]] },
  immortal: { accent: "M9 9h6l1 10-6 5-4-6zm8 0h6l3 9-4 6-6-5z", lights: [[16, 13, 1.3]] },
  colossus: { accent: "M12 5h8l2 10-6 7-6-7zM10 16L5 30m9-11l-2 12m10-15l5 14m-9-11l2 12", lights: [[16, 11, 1.1]] },
  disruptor: { accent: "M16 5l7 7 2 8-5 7h-8l-5-7 2-8z", lights: [[16, 17, 3]] },
  phoenix: { accent: "M16 4l4 11 10-5-7 10 5 6-10-5-2 9-2-9-10 5 5-6-7-10 10 5z" },
  oracle: { accent: "M16 3l5 11 8 4-9 3-4 10-4-10-9-3 8-4z", lights: [[16, 16, 1.5]] },
  voidray: { accent: "M16 3l4 12 10 3-10 3-4 11-4-11-10-3 10-3z", lights: [[16, 16, 1.8]] },
  tempest: { accent: "M16 2l7 11 7 5-9 3-5 11-4-11-10-3 7-5z", lights: [[16, 15, 1.2]] },
  carrier: { accent: "M16 2l8 10 6 7-9 3-5 10-5-10-9-3 6-7zM12 14h8l-2 10h-4z", lights: [[16, 17, 1.2]] },
  mothership: { accent: "M16 2l9 9 5 8-8 8H10l-8-8 5-8z", lights: [[16, 16, 3.5], [16, 16, 1.3]] },

  // The most important building landmarks get their own roof plans.
  commandcenter: { accent: "M7 12h18v12H7zM12 8h8l4 7-8 7-8-7z", lights: [[10, 16, .8], [22, 16, .8]] },
  orbitalcommand: { accent: "M7 12h18v12H7zM16 7l7 8-7 8-7-8z", lights: [[16, 15, 2.1]] },
  planetaryfortress: { accent: "M6 12h20v13H6zM13 9h6v10l11-3v3l-12 4h-5z" },
  barracks: { accent: "M5 13h21v13H6zM9 8h5v10H9zm11-2h4v12h-4z" },
  factory: { accent: "M4 13h23v13H6zM11 8h10v10H11z", lights: [[9, 18, .8], [23, 18, .8]] },
  starport: { accent: "M4 14h24v12H5zM16 6l6 11H10z", lights: [[16, 14, 1.2]] },
  hatchery: { accent: "M16 5l8 7 3 9-6 7H11l-6-7 3-9zM11 15l5-6 5 6-2 8h-6z" },
  lair: { accent: "M16 4l9 8 3 9-7 8H11l-7-8 3-9zM10 16l6-8 6 8-3 9h-6z", lights: [[16, 16, 1.2]] },
  hive: { accent: "M16 3l10 8 3 10-8 9H11l-8-9 3-10zM9 16l7-9 7 9-3 10h-8z", lights: [[16, 15, 1.5]] },
  spire: { accent: "M16 3l4 9 6 6-5 10-5 3-5-3-5-10 6-6z" },
  greaterspire: { accent: "M16 2l5 9 8 6-6 12-7 3-7-3-6-12 8-6z" },
  nexus: { accent: "M16 4l8 7 3 8-6 8H11l-6-8 3-8zM16 8l4 8-4 8-4-8z", lights: [[16, 16, 2.2]] },
  pylon: { accent: "M16 2l6 12-3 14-3 3-3-3-3-14z", lights: [[16, 14, 1.5]] },
  gateway: { accent: "M16 4l11 9-2 12-9 5-9-5-2-12zM16 9l6 8-6 8-6-8z", lights: [[16, 17, 2]] },
  warpgate: { accent: "M16 3l12 10-3 13-9 5-9-5-3-13zM16 8l7 9-7 9-7-9z", lights: [[16, 17, 2.4]] },
  stargate: { accent: "M16 3l12 10-3 13-9 5-9-5-3-13zM8 16h16l-8 11z", lights: [[16, 17, 2]] },

  // Secondary Terran structures, deployables and add-ons
  autoturret: { accent: "M9 15l7-7 7 7-2 10H11zM14 11h5v7l10-3v3l-10 4h-5z", lights: [[16, 15, .8]] },
  kd8charge: { accent: "M16 8l6 5 1 8-7 6-7-6 1-8z", lights: [[16, 17, 2.2]] },
  supplydepot: { accent: "M5 13h22l2 7-5 7H8l-5-7zM8 16h16v4H8z", lights: [[8, 19, .6], [24, 19, .6]] },
  supplydepotlowered: { accent: "M4 17h24l-3 8H7zM8 19h16v3H8z" },
  refinery: { accent: "M9 11l7-5 7 5 4 8-4 8H9l-4-8zM13 11h7l3 8-5 5h-5l-4-5z", lights: [[16, 15, 1.3]] },
  engineeringbay: { accent: "M7 13h18l3 7-4 7H8l-4-7zM13 7h6v13h-6z", lights: [[16, 11, .9]] },
  armory: { accent: "M6 13h20l3 8-5 7H8l-5-7zM10 10h12l-2 9h-8zM15 6h3v10h-3z" },
  fusioncore: { accent: "M16 5l8 7 3 8-6 8H11l-6-8 3-8z", lights: [[16, 17, 3], [16, 17, 1.2]] },
  ghostacademy: { accent: "M7 13h18l3 7-4 8H8l-4-8zM14 6h4v14h-4z", lights: [[16, 11, 1.1]] },
  bunker: { accent: "M6 15l10-7 10 7-3 11H9zM10 16h4v4h-4zm8 0h4v4h-4z" },
  missileturret: { accent: "M9 15l7-8 7 8-2 11H11zM11 10l4-3 1 9-5 2zm10 0l-4-3-1 9 5 2z" },
  sensortower: { accent: "M13 5h6l2 12 6 6-5 6H10l-5-6 6-6z", lights: [[16, 9, 1.1], [16, 15, 2.2]] },
  techlab: { accent: "M7 14h18l3 7-5 6H9l-5-6zM13 10h7v9h-7z", lights: [[17, 14, 1.2]] },
  reactor: { accent: "M7 14h18l3 7-5 6H9l-5-6z", lights: [[13, 17, 1.5], [20, 17, 1.5]] },
  barrackstechlab: { accent: "M7 14h18l3 7-5 6H9l-5-6zM13 10h7v9h-7z", lights: [[17, 14, 1.2]] },
  factorytechlab: { accent: "M7 14h18l3 7-5 6H9l-5-6zM11 10h10v9H11z", lights: [[16, 14, 1.2]] },
  starporttechlab: { accent: "M7 14h18l3 7-5 6H9l-5-6zM16 8l6 10H10z", lights: [[16, 14, 1.2]] },
  barracksreactor: { accent: "M7 14h18l3 7-5 6H9l-5-6z", lights: [[13, 17, 1.5], [20, 17, 1.5]] },
  factoryreactor: { accent: "M7 14h18l3 7-5 6H9l-5-6z", lights: [[12, 17, 1.5], [20, 17, 1.5]] },
  starportreactor: { accent: "M7 14h18l3 7-5 6H9l-5-6z", lights: [[12, 16, 1.5], [20, 16, 1.5]] },

  // Zerg lifecycle, tech and defensive organs
  changeling: { accent: "M16 7l4 5-2 7-2 7-2-7-2-7z", lights: [[16, 12, .8]] },
  broodling: { accent: "M16 9l4 5-2 8-2 5-2-5-2-8zM12 15L6 12l4 7zm8 0l6-3-4 7z" },
  larva: { accent: "M8 19q3-11 9-10t8 10q-2 8-9 8T8 19zM11 17h11m-12 4h12" },
  overlordtransport: { accent: "M16 4l8 7 2 9-5 8H11l-5-8 2-9zM8 20h16l-3 8H11z", lights: [[16, 14, 1]] },
  transportoverlord: { accent: "M16 4l8 7 2 9-5 8H11l-5-8 2-9zM8 20h16l-3 8H11z", lights: [[16, 14, 1]] },
  locustmp: { accent: "M16 6l3 9 10-6-7 10 5 6-9-5-2 8-2-8-9 5 5-6-7-10 10 6z" },
  extractor: { accent: "M9 11l7-6 8 6 3 9-5 8H10l-5-8zM11 13l5-5 5 5-2 11h-6z", lights: [[16, 16, 1.1]] },
  spawningpool: { accent: "M5 18l5-8 6-4 7 4 5 8-5 9H9z", lights: [[16, 20, 2.6]] },
  roachwarren: { accent: "M5 18l6-9 5-4 7 5 5 8-5 9H9zM9 17l7-8 7 8-4 7h-6z" },
  banelingnest: { accent: "M16 5l8 6 3 9-6 8H11l-6-8 3-9z", lights: [[13, 16, 1.1], [19, 18, 1.3], [15, 22, .8]] },
  evolutionchamber: { accent: "M16 5l8 7 3 8-6 8H11l-6-8 3-8zM11 11l5 5 5-5-2 12h-6z" },
  hydraliskden: { accent: "M16 4l6 8 6 6-5 10H9L4 18l6-6zM12 13L6 7l4 12zm8 0l6-6-4 12z" },
  lurkerdenmp: { accent: "M16 3l5 9 8 5-6 12H9L3 17l8-5zM10 14L2 8l6 14zm12 0l8-6-6 14z" },
  infestationpit: { accent: "M16 5l8 6 4 9-7 8H11l-7-8 4-9zM12 12h8l2 10-6 4-6-4z", lights: [[16, 17, 1.5]] },
  ultraliskcavern: { accent: "M16 3l9 8 4 10-8 9H11l-8-9 4-10zM10 14L2 8l7 15zm12 0l8-6-7 15z" },
  nydusnetwork: { accent: "M16 4l8 7 3 9-6 9H11l-6-9 3-9zM12 10h8l2 12-6 5-6-5z" },
  nyduscanal: { accent: "M12 4h8l3 9-2 15-5 3-5-3-2-15zM13 8h6l1 7-4 4-4-4z" },
  spinecrawler: { accent: "M16 4l4 9-2 9-2 8-2-8-2-9zM15 9l11 5-9 3z" },
  sporecrawler: { accent: "M16 5l5 8-2 10-3 7-3-7-2-10z", lights: [[11, 12, 1], [16, 9, 1.2], [21, 12, 1]] },
  creeptumor: { accent: "M16 9l7 4 3 6-5 7H11l-5-7 3-6z", lights: [[16, 18, 1.4]] },

  // Protoss technology, defenses and temporary energy forms
  interceptor: { accent: "M16 6l3 9 10 5-10-2-3 10-3-10-10 2 10-5z", lights: [[16, 16, .8]] },
  adeptphaseshift: { accent: "M16 5l5 7-3 8-2 7-2-7-3-8z", lights: [[16, 15, 2.2]] },
  disruptorphased: { accent: "M16 6l7 7 2 7-5 7h-8l-5-7 2-7z", lights: [[16, 17, 3.8]] },
  assimilator: { accent: "M9 11l7-6 8 6 3 9-5 8H10l-5-8zM16 9l5 7-5 8-5-8z", lights: [[16, 16, 1.8]] },
  forge: { accent: "M16 5l8 7 3 8-6 8H11l-6-8 3-8zM10 16h12l-2 7h-8z", lights: [[16, 18, 1.4]] },
  cyberneticscore: { accent: "M16 4l9 8 3 8-7 9H11l-7-9 3-8zM16 8l5 8-5 9-5-9z", lights: [[16, 16, 2.2]] },
  twilightcouncil: { accent: "M16 3l8 9 5 7-6 10H9L3 19l5-7zM8 13l8 5 8-5-4 12h-8z", lights: [[16, 18, 1.4]] },
  templararchive: { accent: "M16 3l8 9 5 7-6 10H9L3 19l5-7zM12 11h8l2 12-6 4-6-4z", lights: [[16, 16, 1.6]] },
  darkshrine: { accent: "M16 2l7 10 6 7-6 10H9L3 19l6-7zM11 12L4 6l5 15z", lights: [[16, 16, 1.2]] },
  roboticsfacility: { accent: "M16 3l11 9 2 12-13 7L3 24l2-12zM10 15h12l-2 10h-8z", lights: [[16, 18, 1.4]] },
  roboticsbay: { accent: "M16 3l9 9 4 7-6 10H9L3 19l4-7zM11 11h10l2 10-7 6-7-6z", lights: [[16, 17, 1.5]] },
  fleetbeacon: { accent: "M16 2l10 9 4 8-7 11H9L2 19l4-8zM16 7l6 9-6 10-6-10z", lights: [[16, 16, 2.5]] },
  photoncannon: { accent: "M16 5l6 7 5 5-4 10H9L5 17l5-5zM13 10h6v9l9-3v3l-10 4h-5z", lights: [[16, 15, 1.4]] },
  shieldbattery: { accent: "M16 5l7 7 4 6-5 10H10L5 18l4-6z", lights: [[16, 17, 3], [16, 17, 1.2]] },

  // Shared lifecycle and map resources
  mineralfield: { accent: "M16 3l7 10-3 15h-9L8 13zM16 7l3 8-2 9h-4l-2-9z", lights: [[16, 14, .9]] },
  labmineralfield: { accent: "M16 3l7 10-3 15h-9L8 13zM16 7l3 8-2 9h-4l-2-9z", lights: [[16, 14, .9]] },
  vespengeyser: { accent: "M9 14l7-7 8 7 3 7-6 7H11l-6-7z", lights: [[13, 18, 1.3], [19, 16, 1.6]] },
  spaceplatformgeyser: { accent: "M9 14l7-7 8 7 3 7-6 7H11l-6-7z", lights: [[13, 18, 1.3], [19, 16, 1.6]] },
  egg: { accent: "M16 6l7 6 2 9-5 7h-8l-5-7 2-9z" },
  cocoon: { accent: "M16 5l7 7 2 9-5 7h-8l-5-7 2-9zM10 14l12 9m0-9l-12 9" },
  broodlordcocoon: { accent: "M16 4l8 7 3 10-6 8H11l-6-8 3-10zM9 13l14 11m0-11L9 24" },
  ravagercocoon: { accent: "M16 5l7 7 2 9-5 7h-8l-5-7 2-9zM10 14l12 9m0-9l-12 9" },
  banelingcocoon: { accent: "M16 7l6 5 1 8-5 6h-5l-5-6 1-8zM11 14l10 8m0-8l-10 8" },
  overlordcocoon: { accent: "M16 5l7 7 2 9-5 7h-8l-5-7 2-9zM10 14l12 9m0-9l-12 9" },
  overseercocoon: { accent: "M16 5l7 7 2 9-5 7h-8l-5-7 2-9zM10 14l12 9m0-9l-12 9" },
  forcefield: { accent: "M16 5l8 6 3 8-6 8H11l-6-8 3-8z", lights: [[16, 17, 5.5], [16, 17, 2.2]] },
};

function modelIdentity(type: string, detail?: ModelIdentity): ModelIdentity {
  if (detail) return detail;
  // Every remaining catalog entity receives a stable, individual panel layout.
  // This is intentionally deterministic so SSR and hydration render identically.
  let hash = 0;
  for (const char of type) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const x = 10 + hash % 7;
  const y = 10 + (hash >>> 3) % 7;
  const span = 4 + (hash >>> 7) % 5;
  return {
    accent: `M${x} ${y}h${span}l2 4-2 5h-${span}l-2-5zM${8 + (hash % 5)} 23h${5 + ((hash >>> 5) % 6)}v2H${8 + (hash % 5)}z`,
    lights: [[x + span / 2, y + 3, .8]],
  };
}

export const Sc2Model3D = memo(function Sc2Model3D({ type, race, completed, moving, detailed, overview }: { type: string; race?: string; completed: boolean; moving: boolean; detailed: boolean; overview: boolean }) {
  const asset = sc2ModelAsset(type);
  const shape = geometry[asset.shape];
  const modelType = canonicalSc2Type(type);
  const identity = modelIdentity(modelType, identities[modelType]);
  const detailId = asset.detail ? `sc2-detail-${asset.detail}` : shape.hardpoint ? `sc2-hardpoint-${asset.shape}` : null;
  return (
    <svg className={`sc2-model-3d footprint-${asset.footprint} elevation-${asset.elevation ?? "ground"} race-${race?.toLowerCase() ?? "neutral"} model-${modelType} ${asset.facing ? "faces-heading" : ""} ${completed ? "" : "constructing"} ${moving ? "moving" : ""} ${overview ? "lod-overview" : ""}`} viewBox="0 0 32 36" aria-hidden="true">
      <ellipse className="model-shadow" cx="16" cy="31" rx="12" ry="3" />
      {(asset.elevation === "air" || asset.elevation === "high-air") && <line className="model-altitude-line" x1="16" y1="25" x2="16" y2="35" />}
      <use href={`#sc2-shape-${asset.shape}`} />
      {detailed && shape.inset && <use href={`#sc2-inset-${asset.shape}`} />}
      {detailed && detailId && <use href={`#${detailId}`} />}
      <path className="model-identity" d={identity.accent} />
      {detailed && identity.cut && <path className="model-cut" d={identity.cut} />}
      {identity.lights?.map(([cx, cy, r], index) => <circle className="model-light" key={index} cx={cx} cy={cy} r={r} />)}
      <path className="model-specular" d={shape.hull} />
      {!completed && <circle className="model-construction-ring" cx="16" cy="18" r="12" />}
    </svg>
  );
});

export const Sc2ModelSpriteDefs = memo(function Sc2ModelSpriteDefs() {
  return (
    <svg className="sc2-model-sprite-defs" aria-hidden="true">
      <defs>
        {Object.entries(geometry).map(([name, shape]) => (
          <symbol key={`shape-${name}`} id={`sc2-shape-${name}`} viewBox="0 0 32 36">
            <path className="model-depth" d={shape.hull} transform={`translate(0 ${shape.depth ?? 2.6})`} strokeWidth="1.25" strokeLinejoin="round" />
            <path className="model-hull" d={shape.hull} strokeWidth=".85" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </symbol>
        ))}
        {Object.entries(geometry).filter(([, shape]) => shape.inset).map(([name, shape]) => (
          <symbol key={`inset-${name}`} id={`sc2-inset-${name}`} viewBox="0 0 32 36"><path className="model-inset" d={shape.inset} /></symbol>
        ))}
        {Object.entries(geometry).filter(([, shape]) => shape.hardpoint).map(([name, shape]) => (
          <symbol key={`hardpoint-${name}`} id={`sc2-hardpoint-${name}`} viewBox="0 0 32 36"><path className="model-hardpoint" d={shape.hardpoint} strokeWidth=".45" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></symbol>
        ))}
        {Object.entries(details).map(([name, path]) => (
          <symbol key={`detail-${name}`} id={`sc2-detail-${name}`} viewBox="0 0 32 36"><path className="model-detail" d={path} strokeWidth=".45" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></symbol>
        ))}
      </defs>
    </svg>
  );
});
