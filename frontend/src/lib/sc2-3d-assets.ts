import { canonicalSc2Type } from "./sc2-catalog.ts";

export type Sc2ModelShape =
  | "humanoid" | "heavy-humanoid" | "quadruped" | "crawler" | "orb"
  | "tank" | "walker" | "bike" | "mine" | "fighter" | "gunship" | "capital"
  | "terran-command" | "terran-production" | "terran-tech" | "terran-defense" | "terran-supply" | "gas"
  | "zerg-townhall" | "zerg-organic" | "zerg-spire" | "zerg-defense"
  | "protoss-nexus" | "protoss-gateway" | "protoss-tech" | "protoss-defense" | "protoss-pylon"
  | "neutral-tower" | "neutral-rock" | "mineral" | "creep" | "fallback";

export type Sc2ModelAsset = {
  shape: Sc2ModelShape;
  footprint: "tiny" | "small" | "medium" | "large" | "massive";
  elevation?: "ground" | "hover" | "air" | "high-air";
  facing?: boolean;
  detail?: "blades" | "cannon" | "claws" | "engines" | "energy" | "wings";
};

export type Sc2AttackVisual = "bio" | "beam" | "contact" | "flame" | "missile" | "rifle" | "shell";

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

const protoss: Record<string, Sc2ModelAsset> = {
  probe: { shape: "orb", footprint: "tiny", elevation: "hover", facing: true, detail: "energy" },
  zealot: { shape: "humanoid", footprint: "small", facing: true, detail: "blades" },
  stalker: { shape: "quadruped", footprint: "small", elevation: "hover", facing: true, detail: "energy" },
  sentry: { shape: "orb", footprint: "small", elevation: "hover", facing: true, detail: "energy" },
  adept: { shape: "humanoid", footprint: "small", facing: true, detail: "blades" },
  hightemplar: { shape: "humanoid", footprint: "small", elevation: "hover", facing: true, detail: "energy" },
  darktemplar: { shape: "humanoid", footprint: "small", facing: true, detail: "blades" },
  archon: { shape: "orb", footprint: "large", elevation: "hover", detail: "energy" },
  observer: { shape: "fighter", footprint: "tiny", elevation: "air", facing: true, detail: "energy" },
  warpprism: { shape: "gunship", footprint: "medium", elevation: "air", facing: true, detail: "energy" },
  immortal: { shape: "walker", footprint: "medium", elevation: "hover", facing: true, detail: "cannon" },
  colossus: { shape: "walker", footprint: "massive", facing: true, detail: "blades" },
  disruptor: { shape: "orb", footprint: "medium", elevation: "hover", facing: true, detail: "energy" },
  phoenix: { shape: "fighter", footprint: "medium", elevation: "air", facing: true, detail: "wings" },
  oracle: { shape: "fighter", footprint: "medium", elevation: "air", facing: true, detail: "energy" },
  voidray: { shape: "gunship", footprint: "large", elevation: "air", facing: true, detail: "energy" },
  tempest: { shape: "capital", footprint: "large", elevation: "high-air", facing: true, detail: "cannon" },
  carrier: { shape: "capital", footprint: "massive", elevation: "high-air", facing: true, detail: "wings" },
  mothership: { shape: "capital", footprint: "massive", elevation: "high-air", facing: true, detail: "energy" },
  interceptor: { shape: "fighter", footprint: "tiny", elevation: "air", facing: true, detail: "wings" },
  adeptphaseshift: { shape: "humanoid", footprint: "small", elevation: "hover", detail: "energy" },
  disruptorphased: { shape: "orb", footprint: "small", elevation: "hover", detail: "energy" },

  nexus: { shape: "protoss-nexus", footprint: "massive", detail: "energy" },
  pylon: { shape: "protoss-pylon", footprint: "medium", detail: "energy" },
  assimilator: { shape: "gas", footprint: "medium", detail: "energy" },
  gateway: { shape: "protoss-gateway", footprint: "large", detail: "energy" },
  warpgate: { shape: "protoss-gateway", footprint: "large", detail: "wings" },
  forge: { shape: "protoss-tech", footprint: "medium", detail: "energy" },
  cyberneticscore: { shape: "protoss-tech", footprint: "large", detail: "energy" },
  twilightcouncil: { shape: "protoss-tech", footprint: "large", detail: "blades" },
  templararchive: { shape: "protoss-tech", footprint: "large", detail: "energy" },
  darkshrine: { shape: "protoss-tech", footprint: "large", detail: "blades" },
  roboticsfacility: { shape: "protoss-gateway", footprint: "large", detail: "engines" },
  roboticsbay: { shape: "protoss-tech", footprint: "large", detail: "engines" },
  stargate: { shape: "protoss-gateway", footprint: "large", detail: "wings" },
  fleetbeacon: { shape: "protoss-tech", footprint: "massive", detail: "wings" },
  photoncannon: { shape: "protoss-defense", footprint: "medium", detail: "cannon" },
  shieldbattery: { shape: "protoss-defense", footprint: "medium", detail: "energy" },
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
  const neutral = /xelnaga.*tower/.test(key)
    ? { shape: "neutral-tower", footprint: "medium", detail: "energy" } satisfies Sc2ModelAsset
    : /rock|debris|collapsible/.test(key)
      ? { shape: "neutral-rock", footprint: "large" } satisfies Sc2ModelAsset
      : undefined;
  return terran[key] ?? zerg[key] ?? protoss[key] ?? shared[key] ?? neutral ?? fallback;
}

export function hasDedicatedSc2Model(type: string) {
  const key = canonicalSc2Type(type);
  return Boolean(terran[key] || zerg[key] || protoss[key] || shared[key] || /xelnaga.*tower|rock|debris|collapsible/.test(key));
}

export function sc2AttackVisual(type: string): { kind: Sc2AttackVisual; range: number } {
  const key = canonicalSc2Type(type);
  if (/zergling|baneling|broodling|ultralisk|zealot|darktemplar|helliontank/.test(key)) return { kind: "contact", range: 3.5 };
  if (/hellion/.test(key)) return { kind: "flame", range: 5.5 };
  if (/siegetank|liberator|colossus|disruptor|lurker/.test(key)) return { kind: "shell", range: 14 };
  if (/voidray|archon|sentry|hightemplar|oracle|mothership/.test(key)) return { kind: "beam", range: 10 };
  if (/roach|ravager|hydralisk|mutalisk|corruptor|broodlord|queen|infestor|viper/.test(key)) return { kind: "bio", range: 8 };
  if (/marauder|stalker|thor|viking|phoenix|cyclone|tempest|carrier|battlecruiser/.test(key)) return { kind: "missile", range: 11 };
  return { kind: "rifle", range: 7 };
}
