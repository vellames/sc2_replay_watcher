export type ReplayUnit = {
  id: number;
  type: string;
  ownerId: number;
  x: number;
  y: number;
  category: "unit" | "worker" | "building" | "resource";
  isBuilding: boolean;
  isTownHall: boolean;
  isArmy: boolean;
  positionSource: "recorded" | "derived" | "estimated";
  isMoving: boolean;
  heading: number;
  targetX: number | null;
  targetY: number | null;
  activity: "idle" | "moving" | "harvesting";
  completed: boolean;
  mineralCost: number;
  vespeneCost: number;
  supplyCost: number;
  attachmentId: number | null;
  baseId: string | null;
  armyGroupId: string | null;
  movementSpeed: number;
};

export type ReplayBase = {
  id: string;
  ownerId: number;
  townHallId: number;
  x: number;
  y: number;
  status: "active" | "under_attack" | "abandoned";
  workers: number;
  structures: number;
  resourceNodes: number;
  economicValue: number;
};

export type ReplayArmyGroup = {
  id: string;
  ownerId: number;
  x: number;
  y: number;
  unitIds: number[];
  supply: number;
  mineralValue: number;
  vespeneValue: number;
  moving: boolean;
  role: "main" | "defense" | "detachment" | "reinforcements";
};

export type ReplayEngagement = {
  id: string;
  start: number;
  end: number;
  x: number;
  y: number;
  participants: number[];
  losses: Record<string, number>;
  unitsLost: Record<string, number>;
  mineralLosses?: Record<string, number>;
  vespeneLosses?: Record<string, number>;
  supplyLost?: Record<string, number>;
  tradeEfficiency?: Record<string, number>;
  winnerId: number | null;
};

export type ReplayPlayerStats = {
  minerals: number;
  vespene: number;
  mineralRate: number;
  vespeneRate: number;
  workers: number;
  supplyUsed: number;
  supplyCap: number;
  armyValue: number;
  armySupply: number;
  armyUnits: number;
  structures: number;
  armyMinerals: number;
  armyVespene: number;
  armyInProgress: number;
  armyLost: number;
  resourcesKilled: number;
  resourcesLost: number;
};

export type ReplayProduction = {
  id: string;
  playerId: number;
  ability: string;
  product: string;
  kind: "unit" | "building" | "upgrade";
  producerId: number | null;
  producerType: string | null;
  issuedAt: number;
  startedAt: number;
  completesAt: number;
  progress: number;
  queued: boolean;
  confidence: "recorded" | "derived" | "estimated";
};

export type ReplayDeath = {
  id: number;
  type: string;
  ownerId: number;
  x: number;
  y: number;
  time: number;
};

export type ReplayCamera = {
  playerId: number;
  x: number;
  y: number;
  recordedAt: number;
};

export type ReplayFrame = {
  time: number;
  units: ReplayUnit[];
  stats: Record<string, ReplayPlayerStats>;
  deaths: ReplayDeath[];
  production: Record<string, ReplayProduction[]>;
  cameras: Record<string, ReplayCamera>;
  bases: ReplayBase[];
  armyGroups: ReplayArmyGroup[];
};

export type ReplayData = {
  meta: {
    filename: string;
    map: string;
    duration: number;
    playedAt: string | null;
    gameVersion: string;
    winner: string | null;
    trackedEvents: number;
    movementOrders: number;
    cameraEvents: number;
    navigationSource: "s2ma-grid" | "straight-line";
    routedSegments: number;
    routingFallbacks: number;
    astarRoutes: number;
    positionModel: "world-engine";
    cameraModel: "recorded-sample-hold";
    worldSchemaVersion: string;
    engineVersion: string;
    estimatedPositionRatio: number;
    capabilities: {
      unitEconomy: boolean;
      liveVitals: boolean;
      playerCameras: boolean;
      mapNavigation: boolean;
      semanticBases: boolean;
      stableArmyGroups: boolean;
      engagements: boolean;
      analyticTimeline: boolean;
    };
  };
  players: Array<{
    id: number;
    name: string;
    race: string;
    result: string;
    color: string;
  }>;
  mapBounds: { minX: number; maxX: number; minY: number; maxY: number };
  mapVisual: {
    source: "official" | "procedural";
    dataUrl: string | null;
    width: number | null;
    height: number | null;
    mapWidth: number | null;
    mapHeight: number | null;
  };
  mapGeometry: {
    source: "s2ma" | "procedural";
    width: number | null;
    height: number | null;
    gridWidth: number | null;
    gridHeight: number | null;
    cliffRle: number[];
    walkableRle: number[];
    buildableRle: number[];
    clearanceRle: number[];
    ramps: Array<{ x: number; y: number; direction: number; low: number; high: number }>;
    staticObjects: Array<{ type: string; x: number; y: number; rotation: number }>;
  };
  cameraSamples: Record<string, ReplayCamera[]>;
  timeline: Array<{
    time: number;
    type: "base" | "upgrade" | "engagement" | "supply" | "movement";
    label: string;
    playerId: number;
    x?: number;
    y?: number;
    end?: number;
    duration?: number;
    engagementId?: string;
    armyGroupId?: string;
  }>;
  engagements: ReplayEngagement[];
  frames: ReplayFrame[];
};
