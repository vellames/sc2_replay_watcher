import { canonicalSc2Type } from "./sc2-catalog.ts";

export type Sc2ModelShape =
  | "humanoid" | "heavy-humanoid" | "quadruped" | "crawler" | "orb"
  | "tank" | "walker" | "bike" | "mine" | "fighter" | "gunship" | "capital"
  | "terran-command" | "terran-production" | "terran-tech" | "terran-defense" | "terran-supply" | "gas"
  | "zerg-townhall" | "zerg-organic" | "zerg-spire" | "zerg-defense"
  | "protoss-nexus" | "protoss-gateway" | "protoss-tech" | "protoss-defense" | "protoss-pylon"
  | "mineral" | "creep" | "fallback";

export type Sc2ModelAsset = {
  shape: Sc2ModelShape;
  footprint: "tiny" | "small" | "medium" | "large" | "massive";
  elevation?: "ground" | "hover" | "air" | "high-air";
  facing?: boolean;
  detail?: "blades" | "cannon" | "claws" | "engines" | "energy" | "wings";
};

const terran: Record<string, Sc2ModelAsset> = {
  scv: { shape: "walker", footprint: "tiny", facing: true, detail: "claws" },
  mule: { shape: "walker", footprint: "small", facing: true, detail: "claws" },
  marine: { shape: "humanoid", footprint: "tiny", facing: true },
  marauder: { shape: "heavy-humanoid", footprint: "small", facing: true },
  reaper: { shape: "humanoid", footprint: "tiny", facing: true, detail: "engines" },
  ghost: { shape: "humanoid", footprint: "tiny", facing: true, detail: "cannon" },
  hellion: { shape: "bike", footprint: "small", facing: true, detail: "engines" },
  helliontank: { shape: "heavy-humanoid", footprint: "small", facing: true, detail: "claws" },
  widowmine: { shape: "mine", footprint: "small", detail: "cannon" },
  siegetank: { shape: "tank", footprint: "medium", facing: true, detail: "cannon" },
  cyclone: { shape: "tank", footprint: "medium", facing: true, detail: "engines" },
  thor: { shape: "walker", footprint: "large", facing: true, detail: "cannon" },
  vikingfighter: { shape: "fighter", footprint: "medium", elevation: "air", facing: true, detail: "wings" },
  medivac: { shape: "gunship", footprint: "medium", elevation: "air", facing: true, detail: "engines" },
  liberator: { shape: "fighter", footprint: "medium", elevation: "air", facing: true, detail: "cannon" },
  raven: { shape: "orb", footprint: "small", elevation: "air", facing: true, detail: "wings" },
  banshee: { shape: "gunship", footprint: "medium", elevation: "air", facing: true, detail: "cannon" },
  battlecruiser: { shape: "capital", footprint: "massive", elevation: "high-air", facing: true, detail: "engines" },

  commandcenter: { shape: "terran-command", footprint: "massive" },
  orbitalcommand: { shape: "terran-command", footprint: "massive", detail: "energy" },
  planetaryfortress: { shape: "terran-command", footprint: "massive", detail: "cannon" },
  supplydepot: { shape: "terran-supply", footprint: "small" },
  supplydepotlowered: { shape: "terran-supply", footprint: "tiny" },
  refinery: { shape: "gas", footprint: "medium", detail: "energy" },
  barracks: { shape: "terran-production", footprint: "large" },
  factory: { shape: "terran-production", footprint: "large", detail: "engines" },
  starport: { shape: "terran-production", footprint: "large", detail: "wings" },
  engineeringbay: { shape: "terran-tech", footprint: "medium" },
  armory: { shape: "terran-tech", footprint: "medium", detail: "cannon" },
  fusioncore: { shape: "terran-tech", footprint: "large", detail: "energy" },
  ghostacademy: { shape: "terran-tech", footprint: "medium", detail: "energy" },
  bunker: { shape: "terran-defense", footprint: "medium", detail: "cannon" },
  missileturret: { shape: "terran-defense", footprint: "small", detail: "cannon" },
  sensortower: { shape: "terran-defense", footprint: "medium", detail: "energy" },
  barrackstechlab: { shape: "terran-tech", footprint: "small", detail: "energy" },
  barracksreactor: { shape: "terran-tech", footprint: "small", detail: "engines" },
  factorytechlab: { shape: "terran-tech", footprint: "small", detail: "energy" },
  factoryreactor: { shape: "terran-tech", footprint: "small", detail: "engines" },
  starporttechlab: { shape: "terran-tech", footprint: "small", detail: "energy" },
  starportreactor: { shape: "terran-tech", footprint: "small", detail: "engines" },
  techlab: { shape: "terran-tech", footprint: "small", detail: "energy" },
  reactor: { shape: "terran-tech", footprint: "small", detail: "engines" },
};

const zerg: Record<string, Sc2ModelAsset> = {
  drone: { shape: "crawler", footprint: "tiny", facing: true, detail: "claws" },
  zergling: { shape: "quadruped", footprint: "tiny", facing: true, detail: "claws" },
  baneling: { shape: "orb", footprint: "small", facing: true, detail: "energy" },
  queen: { shape: "crawler", footprint: "medium", facing: true, detail: "claws" },
  roach: { shape: "quadruped", footprint: "small", facing: true },
  ravager: { shape: "quadruped", footprint: "medium", facing: true, detail: "cannon" },
  hydralisk: { shape: "heavy-humanoid", footprint: "small", facing: true, detail: "claws" },
  lurker: { shape: "crawler", footprint: "medium", facing: true, detail: "blades" },
  lurkermp: { shape: "crawler", footprint: "medium", facing: true, detail: "blades" },
  infestor: { shape: "orb", footprint: "small", facing: true, detail: "claws" },
  swarmhostmp: { shape: "crawler", footprint: "medium", facing: true },
  ultralisk: { shape: "quadruped", footprint: "massive", facing: true, detail: "blades" },
  mutalisk: { shape: "fighter", footprint: "small", elevation: "air", facing: true, detail: "wings" },
  corruptor: { shape: "gunship", footprint: "medium", elevation: "air", facing: true, detail: "claws" },
  broodlord: { shape: "capital", footprint: "large", elevation: "high-air", facing: true, detail: "claws" },
  viper: { shape: "fighter", footprint: "medium", elevation: "air", facing: true, detail: "claws" },
  overlord: { shape: "orb", footprint: "medium", elevation: "high-air", facing: true },
  overseer: { shape: "orb", footprint: "medium", elevation: "high-air", facing: true, detail: "energy" },
  changeling: { shape: "humanoid", footprint: "tiny", facing: true },
  broodling: { shape: "quadruped", footprint: "tiny", facing: true, detail: "claws" },
  larva: { shape: "crawler", footprint: "tiny", facing: true },
  overlordtransport: { shape: "orb", footprint: "large", elevation: "high-air", facing: true, detail: "claws" },
  transportoverlord: { shape: "orb", footprint: "large", elevation: "high-air", facing: true, detail: "claws" },
  locustmp: { shape: "fighter", footprint: "tiny", elevation: "air", facing: true, detail: "wings" },

  hatchery: { shape: "zerg-townhall", footprint: "massive" },
  lair: { shape: "zerg-townhall", footprint: "massive", detail: "claws" },
  hive: { shape: "zerg-townhall", footprint: "massive", detail: "blades" },
  extractor: { shape: "gas", footprint: "medium", detail: "claws" },
  spawningpool: { shape: "zerg-organic", footprint: "large" },
  roachwarren: { shape: "zerg-organic", footprint: "large", detail: "claws" },
  banelingnest: { shape: "zerg-organic", footprint: "medium", detail: "energy" },
  evolutionchamber: { shape: "zerg-organic", footprint: "medium", detail: "blades" },
  hydraliskden: { shape: "zerg-organic", footprint: "large", detail: "blades" },
  lurkerdenmp: { shape: "zerg-organic", footprint: "large", detail: "claws" },
  infestationpit: { shape: "zerg-organic", footprint: "large", detail: "energy" },
  spire: { shape: "zerg-spire", footprint: "large", detail: "blades" },
  greaterspire: { shape: "zerg-spire", footprint: "massive", detail: "wings" },
  ultraliskcavern: { shape: "zerg-organic", footprint: "massive", detail: "blades" },
  nydusnetwork: { shape: "zerg-townhall", footprint: "large", detail: "claws" },
  nyduscanal: { shape: "zerg-spire", footprint: "medium", detail: "claws" },
  spinecrawler: { shape: "zerg-defense", footprint: "medium", detail: "cannon" },
  sporecrawler: { shape: "zerg-defense", footprint: "medium", detail: "energy" },
  creeptumor: { shape: "creep", footprint: "tiny", detail: "energy" },
};

const shared: Record<string, Sc2ModelAsset> = {
  mineralfield: { shape: "mineral", footprint: "tiny" },
  labmineralfield: { shape: "mineral", footprint: "tiny" },
  vespengeyser: { shape: "gas", footprint: "small", detail: "energy" },
  spaceplatformgeyser: { shape: "gas", footprint: "small", detail: "energy" },
};

const fallback: Sc2ModelAsset = { shape: "fallback", footprint: "small", facing: true };

export function sc2ModelAsset(type: string): Sc2ModelAsset {
  const key = canonicalSc2Type(type);
  return terran[key] ?? zerg[key] ?? shared[key] ?? fallback;
}

export function hasDedicatedSc2Model(type: string) {
  const key = canonicalSc2Type(type);
  return Boolean(terran[key] || zerg[key] || shared[key]);
}
