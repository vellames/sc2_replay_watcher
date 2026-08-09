import type { Locale } from "@/components/i18n";

type LocalizedName = { pt: string; en: string };

const entities: Record<string, LocalizedName> = {
  // Terran units
  scv: { pt: "VCE", en: "SCV" }, marine: { pt: "Fuzileiro", en: "Marine" }, marauder: { pt: "Saqueador", en: "Marauder" },
  reaper: { pt: "Ceifador", en: "Reaper" }, ghost: { pt: "Fantasma", en: "Ghost" }, hellion: { pt: "Endiabrado", en: "Hellion" },
  helliontank: { pt: "Demolidor", en: "Hellbat" }, widowmine: { pt: "Mina Viúva", en: "Widow Mine" }, siegetank: { pt: "Tanque de Cerco", en: "Siege Tank" },
  siegetanksieged: { pt: "Tanque de Cerco", en: "Siege Tank" }, cyclone: { pt: "Ciclone", en: "Cyclone" }, thor: { pt: "Thor", en: "Thor" },
  vikingfighter: { pt: "Viking", en: "Viking" }, vikingassault: { pt: "Viking", en: "Viking" }, medivac: { pt: "Ambunave", en: "Medivac" },
  liberator: { pt: "Libertador", en: "Liberator" }, liberatorag: { pt: "Libertador", en: "Liberator" }, raven: { pt: "Corvo", en: "Raven" },
  banshee: { pt: "Banshee", en: "Banshee" }, battlecruiser: { pt: "Cruzador de Batalha", en: "Battlecruiser" }, mule: { pt: "MULA", en: "MULE" },

  // Zerg units
  drone: { pt: "Zangão", en: "Drone" }, zergling: { pt: "Zergnídeo", en: "Zergling" }, baneling: { pt: "Tatu-bomba", en: "Baneling" },
  queen: { pt: "Rainha", en: "Queen" }, roach: { pt: "Barata", en: "Roach" }, ravager: { pt: "Devastador", en: "Ravager" },
  hydralisk: { pt: "Hidralisca", en: "Hydralisk" }, lurker: { pt: "Lurker", en: "Lurker" }, lurkermp: { pt: "Lurker", en: "Lurker" },
  infestor: { pt: "Infestador", en: "Infestor" }, swarmhostmp: { pt: "Anfitrião do Enxame", en: "Swarm Host" }, ultralisk: { pt: "Ultralisca", en: "Ultralisk" },
  mutalisk: { pt: "Mutalisca", en: "Mutalisk" }, corruptor: { pt: "Corruptor", en: "Corruptor" }, broodlord: { pt: "Senhor das Castas", en: "Brood Lord" },
  viper: { pt: "Víbor", en: "Viper" }, overlord: { pt: "Suserano", en: "Overlord" }, overseer: { pt: "Supervisor", en: "Overseer" },
  changeling: { pt: "Transmorfo", en: "Changeling" }, broodling: { pt: "Filhote", en: "Broodling" }, larva: { pt: "Larva", en: "Larva" },

  // Protoss units
  probe: { pt: "Sonda", en: "Probe" }, zealot: { pt: "Fanático", en: "Zealot" }, stalker: { pt: "Perseguidor", en: "Stalker" },
  sentry: { pt: "Sentinela", en: "Sentry" }, adept: { pt: "Adepta", en: "Adept" }, hightemplar: { pt: "Alto Templário", en: "High Templar" },
  darktemplar: { pt: "Templário das Trevas", en: "Dark Templar" }, archon: { pt: "Arconte", en: "Archon" }, observer: { pt: "Observador", en: "Observer" },
  warpprism: { pt: "Prisma de Dobra", en: "Warp Prism" }, immortal: { pt: "Imortal", en: "Immortal" }, colossus: { pt: "Colosso", en: "Colossus" },
  disruptor: { pt: "Disruptor", en: "Disruptor" }, phoenix: { pt: "Fênix", en: "Phoenix" }, oracle: { pt: "Oráculo", en: "Oracle" },
  voidray: { pt: "Raio Vazio", en: "Void Ray" }, tempest: { pt: "Tormenta", en: "Tempest" }, carrier: { pt: "Nave-mãe", en: "Carrier" },
  mothership: { pt: "Nave-Mãe", en: "Mothership" }, interceptor: { pt: "Interceptador", en: "Interceptor" },

  // Terran structures
  commandcenter: { pt: "Centro de Comando", en: "Command Center" }, orbitalcommand: { pt: "Comando Orbital", en: "Orbital Command" },
  planetaryfortress: { pt: "Fortaleza Planetária", en: "Planetary Fortress" }, supplydepot: { pt: "Depósito de Suprimentos", en: "Supply Depot" },
  supplydepotlowered: { pt: "Depósito de Suprimentos", en: "Supply Depot" }, refinery: { pt: "Refinaria", en: "Refinery" }, barracks: { pt: "Quartel", en: "Barracks" },
  factory: { pt: "Fábrica", en: "Factory" }, starport: { pt: "Espaçoporto", en: "Starport" }, engineeringbay: { pt: "Engenharia", en: "Engineering Bay" },
  armory: { pt: "Arsenal", en: "Armory" }, fusioncore: { pt: "Núcleo de Fusão", en: "Fusion Core" }, ghostacademy: { pt: "Academia Fantasma", en: "Ghost Academy" },
  bunker: { pt: "Bunker", en: "Bunker" }, missileturret: { pt: "Torre de Mísseis", en: "Missile Turret" }, sensortower: { pt: "Torre de Sensores", en: "Sensor Tower" },
  barrackstechlab: { pt: "Laboratório do Quartel", en: "Barracks Tech Lab" }, barracksreactor: { pt: "Reator do Quartel", en: "Barracks Reactor" },
  factorytechlab: { pt: "Laboratório da Fábrica", en: "Factory Tech Lab" }, factoryreactor: { pt: "Reator da Fábrica", en: "Factory Reactor" },
  starporttechlab: { pt: "Laboratório do Espaçoporto", en: "Starport Tech Lab" }, starportreactor: { pt: "Reator do Espaçoporto", en: "Starport Reactor" },

  // Zerg structures
  hatchery: { pt: "Incubadora", en: "Hatchery" }, lair: { pt: "Covil", en: "Lair" }, hive: { pt: "Colmeia", en: "Hive" }, extractor: { pt: "Extrator", en: "Extractor" },
  spawningpool: { pt: "Piscina de Desova", en: "Spawning Pool" }, roachwarren: { pt: "Ninho de Baratas", en: "Roach Warren" }, banelingnest: { pt: "Ninho de Tatus-bomba", en: "Baneling Nest" },
  evolutionchamber: { pt: "Câmara Evolutiva", en: "Evolution Chamber" }, hydraliskden: { pt: "Covil de Hidraliscas", en: "Hydralisk Den" }, lurkerdenmp: { pt: "Covil de Lurkers", en: "Lurker Den" },
  infestationpit: { pt: "Poço de Infestação", en: "Infestation Pit" }, spire: { pt: "Pináculo", en: "Spire" }, greaterspire: { pt: "Pináculo Maior", en: "Greater Spire" },
  ultraliskcavern: { pt: "Caverna de Ultralisco", en: "Ultralisk Cavern" }, nydusnetwork: { pt: "Rede Nydus", en: "Nydus Network" }, nyduscanal: { pt: "Verme Nydus", en: "Nydus Worm" },
  spinecrawler: { pt: "Rastejante de Espinhos", en: "Spine Crawler" }, sporecrawler: { pt: "Rastejante de Esporos", en: "Spore Crawler" }, creeptumor: { pt: "Tumor de Gosma", en: "Creep Tumor" },

  // Protoss structures
  nexus: { pt: "Nexus", en: "Nexus" }, pylon: { pt: "Pilar", en: "Pylon" }, assimilator: { pt: "Assimilador", en: "Assimilator" }, gateway: { pt: "Portal", en: "Gateway" },
  warpgate: { pt: "Portal de Dobra", en: "Warp Gate" }, forge: { pt: "Forja", en: "Forge" }, cyberneticscore: { pt: "Núcleo Cibernético", en: "Cybernetics Core" },
  twilightcouncil: { pt: "Conselho do Crepúsculo", en: "Twilight Council" }, templararchive: { pt: "Arquivo Templário", en: "Templar Archives" }, darkshrine: { pt: "Santuário das Trevas", en: "Dark Shrine" },
  roboticsfacility: { pt: "Instalação Robótica", en: "Robotics Facility" }, roboticsbay: { pt: "Baía Robótica", en: "Robotics Bay" }, stargate: { pt: "Portal Estelar", en: "Stargate" },
  fleetbeacon: { pt: "Sinalizador da Frota", en: "Fleet Beacon" }, photoncannon: { pt: "Canhão de Fótons", en: "Photon Cannon" }, shieldbattery: { pt: "Bateria de Escudo", en: "Shield Battery" },

  // Common upgrades and abilities
  stimpack: { pt: "Estimulantes", en: "Stimpack" }, combatshield: { pt: "Escudo de Combate", en: "Combat Shield" }, concussiveshells: { pt: "Projéteis Concussivos", en: "Concussive Shells" },
  siegetech: { pt: "Modo de Cerco", en: "Siege Mode" }, warpgateresearch: { pt: "Portal de Dobra", en: "Warp Gate" }, blinktech: { pt: "Translação", en: "Blink" },
  charge: { pt: "Investida", en: "Charge" }, adeptpiercingattack: { pt: "Glaives Ressonantes", en: "Resonating Glaives" },
  zerglingmovementspeed: { pt: "Aprimoramento Metabólico", en: "Metabolic Boost" }, zerglingattackspeed: { pt: "Glândulas Adrenais", en: "Adrenal Glands" },
  glialreconstitution: { pt: "Reconstituição Glial", en: "Glial Reconstitution" }, tunnelingclaws: { pt: "Garras Escavadoras", en: "Tunneling Claws" },
  burrow: { pt: "Escavação", en: "Burrow" }, centrifugalhooks: { pt: "Ganchos Centrífugos", en: "Centrifugal Hooks" },
};

const genericFamilies: Array<[RegExp, LocalizedName]> = [
  [/terraninfantryweaponslevel(\d)/, { pt: "Armas de Infantaria Terrana", en: "Terran Infantry Weapons" }],
  [/terraninfantryarmorslevel(\d)/, { pt: "Blindagem de Infantaria Terrana", en: "Terran Infantry Armor" }],
  [/terranvehicleweaponslevel(\d)/, { pt: "Armas de Veículos Terranos", en: "Terran Vehicle Weapons" }],
  [/terranvehicleandshiparmorslevel(\d)/, { pt: "Blindagem Mecânica Terrana", en: "Terran Vehicle and Ship Plating" }],
  [/terranbattlecruiserweaponrefitlevel(\d)/, { pt: "Armas de Naves Terranas", en: "Terran Ship Weapons" }],
  [/zergmeleeweaponslevel(\d)/, { pt: "Ataques Corpo a Corpo Zerg", en: "Zerg Melee Attacks" }],
  [/zergmissileweaponslevel(\d)/, { pt: "Ataques de Projéteis Zerg", en: "Zerg Missile Attacks" }],
  [/zerggroundarmorslevel(\d)/, { pt: "Carapaça Terrestre Zerg", en: "Zerg Ground Carapace" }],
  [/zergflyerweaponslevel(\d)/, { pt: "Ataques Aéreos Zerg", en: "Zerg Flyer Attacks" }],
  [/zergflyerarmorslevel(\d)/, { pt: "Carapaça Aérea Zerg", en: "Zerg Flyer Carapace" }],
  [/protossgroundweaponslevel(\d)/, { pt: "Armas Terrestres Protoss", en: "Protoss Ground Weapons" }],
  [/protossgroundarmorslevel(\d)/, { pt: "Armadura Terrestre Protoss", en: "Protoss Ground Armor" }],
  [/protossshieldslevel(\d)/, { pt: "Escudos Protoss", en: "Protoss Shields" }],
  [/protossairweaponslevel(\d)/, { pt: "Armas Aéreas Protoss", en: "Protoss Air Weapons" }],
  [/protossairarmorslevel(\d)/, { pt: "Armadura Aérea Protoss", en: "Protoss Air Armor" }],
];

export function normalizeSc2Type(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function readableSc2Type(value: string) {
  return value.replaceAll("_", " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

export function sc2Name(value: string, locale: Locale) {
  const key = normalizeSc2Type(value);
  const direct = entities[key];
  if (direct) return direct[locale];

  for (const [pattern, name] of genericFamilies) {
    const match = key.match(pattern);
    if (match) return `${name[locale]} ${match[1]}`;
  }
  return readableSc2Type(value);
}

export function hasLocalizedSc2Name(value: string) {
  const key = normalizeSc2Type(value);
  return Boolean(entities[key] || genericFamilies.some(([pattern]) => pattern.test(key)));
}
