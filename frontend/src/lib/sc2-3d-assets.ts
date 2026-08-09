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

const shared: Record<string, Sc2ModelAsset> = {
  mineralfield: { shape: "mineral", footprint: "tiny" },
  labmineralfield: { shape: "mineral", footprint: "tiny" },
  vespengeyser: { shape: "gas", footprint: "small", detail: "energy" },
  spaceplatformgeyser: { shape: "gas", footprint: "small", detail: "energy" },
};

const fallback: Sc2ModelAsset = { shape: "fallback", footprint: "small", facing: true };

export function sc2ModelAsset(type: string): Sc2ModelAsset {
  const key = canonicalSc2Type(type);
  return terran[key] ?? shared[key] ?? fallback;
}

export function hasDedicatedSc2Model(type: string) {
  const key = canonicalSc2Type(type);
  return Boolean(terran[key] || shared[key]);
}
