"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bug,
  ChevronDown,
  CircleDot,
  Clock3,
  Crosshair,
  Database,
  Eye,
  EyeOff,
  Factory,
  FastForward,
  FileUp,
  Flame,
  FlaskConical,
  Hammer,
  Home,
  Landmark,
  ListTree,
  Map as MapIcon,
  Minus,
  Navigation,
  Package,
  Pause,
  Pickaxe,
  Play,
  Plus,
  Radar,
  RotateCcw,
  Shield,
  Scan,
  SkipBack,
  SkipForward,
  Sparkles,
  Swords,
  Target,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { useI18n } from "@/components/i18n";
import { useReplay } from "@/components/replay-context";
import { SiteHeader } from "@/components/site-chrome";
import { TerrainLayer } from "@/components/terrain-layer";
import type { ReplayUnit } from "@/lib/types";

type LayerKey = "terrain" | "army" | "workers" | "buildings" | "resources" | "cameras";
type MapSelection =
  | { kind: "unit"; unitId: number }
  | { kind: "engagement"; engagementId: string }
  | { kind: "group"; groupType: "army" | "base" | "workers" | "structures" | "resources"; unitIds: number[] };

function formatTime(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function cleanType(type: string) {
  return type.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function compactNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function signedCompactNumber(value: number) {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : "−"}${compactNumber(Math.abs(value))}`;
}

type UnitVisual = {
  kind: "addon" | "air" | "army" | "creep-node" | "defense" | "gas" | "production" | "resource" | "supply" | "tech" | "town-hall" | "worker";
  icon: LucideIcon;
};

function unitVisual(unit: ReplayUnit): UnitVisual {
  const type = unit.type.toLowerCase().replaceAll(/[^a-z0-9]/g, "");

  if (unit.category === "resource") return { kind: "resource", icon: Database };
  if (type.includes("creeptumor")) return { kind: "creep-node", icon: CircleDot };
  if (type.includes("techlab") || type.includes("reactor")) return { kind: "addon", icon: Wrench };
  if (unit.isTownHall) return { kind: "town-hall", icon: Landmark };
  if (unit.category === "worker") return { kind: "worker", icon: Pickaxe };

  if (/overlord|overseer|medivac|vikingfighter|liberator|banshee|raven|battlecruiser|mutalisk|corruptor|broodlord|viper|phoenix|oracle|voidray|carrier|tempest|mothership|flying/.test(type)) {
    return { kind: "air", icon: Navigation };
  }

  if (unit.isBuilding) {
    if (/missileturret|sensortower/.test(type)) return { kind: "defense", icon: Radar };
    if (/sporecrawler|spinecrawler|bunker|photoncannon|shieldbattery/.test(type)) return { kind: "defense", icon: Shield };
    if (/supplydepot|pylon/.test(type)) return { kind: "supply", icon: Package };
    if (/refinery|extractor|assimilator/.test(type)) return { kind: "gas", icon: Database };
    if (/barracks|factory|starport|gateway|warpgate|roboticsfacility|stargate|spawningpool|roachwarren|banelingnest|hydraliskden|nydus/.test(type)) return { kind: "production", icon: Factory };
    if (/techlab|reactor|engineeringbay|armory|ghostacademy|fusioncore|evolutionchamber|infestationpit|ultraliskcavern|spire|templararchive|cyberneticscore|forge/.test(type)) return { kind: "tech", icon: FlaskConical };
    return { kind: "tech", icon: Home };
  }

  if (/ghost|queen|infestor|viper|raven|hightemplar|sentry|oracle/.test(type)) return { kind: "army", icon: Sparkles };
  if (/siegetank|liberator|lurker|colossus|disruptor|tempest/.test(type)) return { kind: "army", icon: Crosshair };
  if (/zergling|baneling|ultralisk|zealot|darktemplar|broodling/.test(type)) return { kind: "army", icon: Bug };
  return { kind: "army", icon: Swords };
}

export function ReplayViewer() {
  const { replay } = useReplay();
  const { t } = useI18n();
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    terrain: true,
    army: true,
    workers: true,
    buildings: true,
    resources: true,
    cameras: true,
  });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const { currentFrame, nextFrame, frameProgress } = useMemo(() => {
    if (!replay?.frames.length) return { currentFrame: null, nextFrame: null, frameProgress: 0 };
    let low = 0;
    let high = replay.frames.length - 1;
    let currentIndex = 0;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (replay.frames[middle].time <= currentTime) {
        currentIndex = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    const current = replay.frames[currentIndex];
    const next = replay.frames[currentIndex + 1] ?? null;
    const gap = next ? next.time - current.time : 0;
    const progress = gap > 0 ? Math.min(1, Math.max(0, (currentTime - current.time) / gap)) : 0;
    return { currentFrame: current, nextFrame: next, frameProgress: progress };
  }, [replay, currentTime]);

  const renderedUnits = useMemo(() => {
    if (!currentFrame || !nextFrame || frameProgress <= 0) return currentFrame?.units ?? [];
    const nextUnits = new Map(nextFrame.units.map((unit) => [unit.id, unit]));
    return currentFrame.units.map((unit) => {
      const target = nextUnits.get(unit.id);
      if (!target) return unit;
      const deltaX = target.x - unit.x;
      const deltaY = target.y - unit.y;
      if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) return unit;
      return {
        ...unit,
        x: unit.x + deltaX * frameProgress,
        y: unit.y + deltaY * frameProgress,
        isMoving: true,
        heading: Math.atan2(deltaY, deltaX) * (180 / Math.PI),
        targetX: unit.targetX ?? target.x,
        targetY: unit.targetY ?? target.y,
      };
    });
  }, [currentFrame, nextFrame, frameProgress]);

  const renderedCameras = useMemo(() => {
    if (!replay) return [];
    const tracks = replay.cameraSamples ?? {};
    if (!Object.keys(tracks).length) return Object.values(currentFrame?.cameras ?? {});
    return Object.values(tracks).flatMap((samples) => {
      let low = 0;
      let high = samples.length - 1;
      let latest = -1;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        if (samples[middle].recordedAt <= currentTime) {
          latest = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      return latest >= 0 ? [samples[latest]] : [];
    });
  }, [replay, currentFrame, currentTime]);

  useEffect(() => {
    if (!playing || !replay) return;
    let previousTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previousTick) / 1000;
      previousTick = now;
      setCurrentTime((time) => {
        const next = time + elapsed * speed;
        if (next >= replay.meta.duration) {
          setPlaying(false);
          return replay.meta.duration;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [playing, replay, speed]);

  useEffect(() => {
    if (!replay) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      const seekStep = event.shiftKey ? 1 : 5;
      if (event.code === "ArrowLeft") setCurrentTime((value) => Math.max(0, value - seekStep));
      if (event.code === "ArrowRight") setCurrentTime((value) => Math.min(replay.meta.duration, value + seekStep));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replay]);

  if (!replay) {
    return (
      <div className="app-shell">
        <SiteHeader />
        <main className="empty-watcher">
          <div className="empty-icon"><FileUp size={30} /></div>
          <p className="eyebrow">{t("empty.eyebrow")}</p>
          <h1>{t("empty.titleLine1")}<br />{t("empty.titleLine2")}</h1>
          <p>{t("empty.text")}</p>
          <Link href="/"><ArrowLeft size={16} /> {t("empty.button")}</Link>
        </main>
      </div>
    );
  }

  const bounds = replay.mapBounds;
  const hasMapGeometry = replay.mapGeometry?.source === "s2ma";
  const mapMode = hasMapGeometry ? "geometric" : "procedural";
  const mapAspect = (replay.mapGeometry?.width ?? bounds.maxX - bounds.minX) / (replay.mapGeometry?.height ?? bounds.maxY - bounds.minY);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const playerById = new Map(replay.players.map((player) => [player.id, player]));
  const attachedAddonByParent = new Map(
    renderedUnits.filter((unit) => unit.attachmentId != null).map((addon) => [addon.attachmentId as number, addon]),
  );
  const ownedUnits = currentFrame?.units.filter((unit) => playerById.has(unit.ownerId)) ?? [];
  const combatUnits = ownedUnits.filter((unit) => unit.isArmy).length;
  const workers = ownedUnits.filter((unit) => unit.category === "worker").length;
  const structures = ownedUnits.filter((unit) => unit.category === "building" && unit.attachmentId == null).length;
  const nextEvent = replay.timeline.find((event) => event.time > currentTime);
  const productionByProducer = new Map<number, number>();
  for (const orders of Object.values(currentFrame?.production ?? {})) {
    for (const order of orders) {
      if (order.producerId) productionByProducer.set(order.producerId, (productionByProducer.get(order.producerId) ?? 0) + 1);
    }
  }

  const visibleUnits = renderedUnits.filter((unit) => {
    if (unit.category === "resource") return layers.resources;
    if (unit.category === "worker") return layers.workers;
    if (unit.category === "building") return layers.buildings;
    return layers.army;
  });

  const strategicView = zoom < 1.25;
  const showBaseMarkers = strategicView && layers.buildings && (currentFrame?.bases?.length ?? 0) > 0;
  const townHallsByOwner = new Map<number, ReplayUnit[]>();
  for (const townHall of visibleUnits.filter((unit) => unit.isTownHall)) {
    const bases = townHallsByOwner.get(townHall.ownerId) ?? [];
    bases.push(townHall);
    townHallsByOwner.set(townHall.ownerId, bases);
  }
  const strategicBaseKey = (unit: ReplayUnit, kind: string, fallback: string) => {
    if (!strategicView) return fallback;
    // Structure morph histories can leave several town-hall identities alive in
    // replay data. A coarse spatial district is more stable for those markers.
    if (kind === "structure") return fallback;
    const nearest = (townHallsByOwner.get(unit.ownerId) ?? [])
      .map((base) => ({ base, distance: (base.x - unit.x) ** 2 + (base.y - unit.y) ** 2 }))
      .sort((left, right) => left.distance - right.distance)[0];
    const baseRadius = 32;
    return nearest && nearest.distance <= baseRadius ** 2 ? `${unit.ownerId}:${kind}:base:${nearest.base.id}` : fallback;
  };
  const clusterData = new Map<string, { id: string; ownerId: number; x: number; y: number; units: ReplayUnit[] }>();
  if (zoom < 1.55 && layers.army) {
    const cell = (strategicView ? 18 : 14) / zoom;
    for (const unit of visibleUnits.filter((candidate) => candidate.isArmy && playerById.has(candidate.ownerId))) {
      const key = `${unit.ownerId}:${Math.floor(unit.x / cell)}:${Math.floor(unit.y / cell)}`;
      const cluster = clusterData.get(key) ?? { id: key, ownerId: unit.ownerId, x: 0, y: 0, units: [] };
      cluster.units.push(unit);
      cluster.x += unit.x;
      cluster.y += unit.y;
      clusterData.set(key, cluster);
    }
  }
  const clusters = [...clusterData.values()].filter((cluster) => cluster.units.length >= (strategicView ? 2 : 3)).map((cluster) => ({
    ...cluster,
    x: cluster.x / cluster.units.length,
    y: cluster.y / cluster.units.length,
  }));
  const semanticArmyClusters = strategicView && (currentFrame?.armyGroups?.length ?? 0) > 0
    ? currentFrame!.armyGroups.map((group) => {
      const nextGroup = nextFrame?.armyGroups?.find((candidate) => candidate.id === group.id);
      return {
        id: group.id,
        ownerId: group.ownerId,
        x: nextGroup ? group.x + (nextGroup.x - group.x) * frameProgress : group.x,
        y: nextGroup ? group.y + (nextGroup.y - group.y) * frameProgress : group.y,
        units: renderedUnits.filter((unit) => group.unitIds.includes(unit.id)),
        role: group.role,
      };
    }).filter((group) => group.units.length > 0)
    : clusters;
  const workerClusterData = new Map<string, { id: string; ownerId: number; x: number; y: number; units: ReplayUnit[] }>();
  if (zoom < 1.7 && layers.workers) {
    const cell = (strategicView ? 14 : 9) / zoom;
    for (const unit of visibleUnits.filter((candidate) => candidate.category === "worker" && (!showBaseMarkers || !candidate.baseId) && playerById.has(candidate.ownerId))) {
      const fallbackKey = `${unit.ownerId}:worker:${Math.floor(unit.x / cell)}:${Math.floor(unit.y / cell)}`;
      const key = strategicBaseKey(unit, "worker", fallbackKey);
      const cluster = workerClusterData.get(key) ?? { id: key, ownerId: unit.ownerId, x: 0, y: 0, units: [] };
      cluster.units.push(unit);
      cluster.x += unit.x;
      cluster.y += unit.y;
      workerClusterData.set(key, cluster);
    }
  }
  const workerClusters = [...workerClusterData.values()].filter((cluster) => cluster.units.length >= (strategicView ? 2 : 4)).map((cluster) => ({
    ...cluster,
    x: cluster.x / cluster.units.length,
    y: cluster.y / cluster.units.length,
  }));
  const structureClusterData = new Map<string, { id: string; ownerId: number; x: number; y: number; units: ReplayUnit[] }>();
  if (zoom < 1.5 && layers.buildings) {
    const cell = (strategicView ? 72 : 11) / zoom;
    for (const unit of visibleUnits.filter((candidate) => candidate.category === "building" && (!strategicView || !candidate.baseId) && !candidate.isTownHall && candidate.attachmentId == null && !candidate.type.toLowerCase().includes("creeptumor") && playerById.has(candidate.ownerId))) {
      const fallbackKey = `${unit.ownerId}:structure:${Math.floor(unit.x / cell)}:${Math.floor(unit.y / cell)}`;
      const key = strategicBaseKey(unit, "structure", fallbackKey);
      const cluster = structureClusterData.get(key) ?? { id: key, ownerId: unit.ownerId, x: 0, y: 0, units: [] };
      cluster.units.push(unit);
      cluster.x += unit.x;
      cluster.y += unit.y;
      structureClusterData.set(key, cluster);
    }
  }
  const structureClusters = [...structureClusterData.values()].filter((cluster) => cluster.units.length >= 2).map((cluster) => ({
    ...cluster,
    x: cluster.x / cluster.units.length,
    y: cluster.y / cluster.units.length,
  }));
  const resourceClusterData = new Map<string, { id: string; ownerId: number; x: number; y: number; units: ReplayUnit[] }>();
  if (zoom < 1.35 && layers.resources && !showBaseMarkers) {
    const cell = 14 / zoom;
    for (const unit of visibleUnits.filter((candidate) => candidate.category === "resource")) {
      const key = `resource:${Math.floor(unit.x / cell)}:${Math.floor(unit.y / cell)}`;
      const cluster = resourceClusterData.get(key) ?? { id: key, ownerId: 0, x: 0, y: 0, units: [] };
      cluster.units.push(unit);
      cluster.x += unit.x;
      cluster.y += unit.y;
      resourceClusterData.set(key, cluster);
    }
  }
  const resourceClusters = [...resourceClusterData.values()].filter((cluster) => cluster.units.length >= 3).map((cluster) => ({
    ...cluster,
    x: cluster.x / cluster.units.length,
    y: cluster.y / cluster.units.length,
  }));
  const baseUnitIds = showBaseMarkers
    ? visibleUnits.filter((unit) => unit.baseId || currentFrame?.bases?.some((base) => base.townHallId === unit.id)).map((unit) => unit.id)
    : [];
  const clusteredIds = new Set([...semanticArmyClusters, ...workerClusters, ...structureClusters, ...resourceClusters].flatMap((cluster) => cluster.units.map((unit) => unit.id)).concat(baseUnitIds));
  const selectedUnitId = selection?.kind === "unit" ? selection.unitId : null;
  if (selectedUnitId != null) clusteredIds.delete(selectedUnitId);
  const selectedUnit = visibleUnits.find((unit) => unit.id === selectedUnitId) ?? null;
  const selectedEngagement = selection?.kind === "engagement"
    ? replay.engagements.find((engagement) => engagement.id === selection.engagementId) ?? null
    : null;
  const selectedAddon = selectedUnit ? attachedAddonByParent.get(selectedUnit.id) ?? null : null;
  const selectedGroupUnits = selection?.kind === "group"
    ? renderedUnits.filter((unit) => selection.unitIds.includes(unit.id))
    : [];
  const inspectedUnits = selectedUnit ? [selectedUnit] : selectedGroupUnits;
  const inspectedPlayer = inspectedUnits.length > 0 ? playerById.get(inspectedUnits[0].ownerId) : undefined;
  const economicUnits = selectedAddon ? [...inspectedUnits, selectedAddon] : inspectedUnits;
  const inspectedMinerals = economicUnits.reduce((sum, unit) => sum + (unit.mineralCost ?? 0), 0);
  const inspectedVespene = economicUnits.reduce((sum, unit) => sum + (unit.vespeneCost ?? 0), 0);
  const inspectedSupply = economicUnits.reduce((sum, unit) => sum + (unit.supplyCost ?? 0), 0);
  const confidenceCounts = inspectedUnits.reduce((counts, unit) => {
    counts[unit.positionSource] += 1;
    return counts;
  }, { recorded: 0, derived: 0, estimated: 0 });
  const composition = [...inspectedUnits.reduce((types, unit) => {
    const item = types.get(unit.type) ?? { type: unit.type, count: 0, minerals: 0, vespene: 0 };
    item.count += 1;
    item.minerals += unit.mineralCost ?? 0;
    item.vespene += unit.vespeneCost ?? 0;
    types.set(unit.type, item);
    return types;
  }, new Map<string, { type: string; count: number; minerals: number; vespene: number }>()).values()].sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  const selectedProduction = selectedUnit
    ? Object.values(currentFrame?.production ?? {}).flat().filter((order) => order.producerId === selectedUnit.id || order.producerId === selectedAddon?.id)
    : [];
  const markerBudget = strategicView ? 48 : zoom < 1.7 ? 140 : 260;
  const individualUnits = visibleUnits
    .filter((unit) => !clusteredIds.has(unit.id) && unit.attachmentId == null)
    .filter((unit) => !strategicView || unit.id === selectedUnitId || unit.isArmy || unit.isTownHall)
    .sort((left, right) => {
      const priority = (unit: ReplayUnit) => unit.id === selectedUnitId ? 0 : unit.isArmy ? 1 : unit.isTownHall ? 2 : unit.category === "building" ? 3 : unit.category === "worker" ? 4 : 5;
      return priority(left) - priority(right) || left.id - right.id;
    })
    .slice(0, markerBudget);
  const toPercent = (x: number, y: number) => ({
    left: ((x - bounds.minX) / width) * 100,
    bottom: ((y - bounds.minY) / height) * 100,
  });
  const visibleEngagements = (replay.engagements ?? []).filter((engagement) => currentTime >= engagement.start - 3 && currentTime <= engagement.end + 8);
  const cameraTrail = Object.values(replay.cameraSamples ?? {}).flatMap((samples) => samples
    .filter((camera) => camera.recordedAt <= currentTime && camera.recordedAt >= currentTime - 10)
    .filter((_, index, recent) => index % Math.max(1, Math.ceil(recent.length / 12)) === 0)
    .map((camera) => ({
      ...camera,
      frameTime: camera.recordedAt,
      opacity: Math.max(.15, 1 - (currentTime - camera.recordedAt) / 10),
    })));
  const toggleLayer = (layer: LayerKey) => {
    if (layer === "buildings" && layers.buildings && selection?.kind === "group" && selection.groupType === "base") setSelection(null);
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  };
  const resetMap = () => { setZoom(1); setPan({ x: 0, y: 0 }); setSelection(null); };
  const layerLabels: Record<LayerKey, string> = {
    terrain: t("watcher.layer.terrain"),
    army: t("watcher.layer.army"),
    workers: t("watcher.layer.workers"),
    buildings: t("watcher.layer.buildings"),
    resources: t("watcher.layer.resources"),
    cameras: t("watcher.layer.cameras"),
  };
  const seekRelevantEvent = (direction: -1 | 1) => {
    const events = replay.timeline.filter((event) => event.type !== "movement" && event.time > 0);
    const target = direction < 0
      ? [...events].reverse().find((event) => event.time < currentTime - .5)
      : events.find((event) => event.time > currentTime + .5);
    if (!target) return;
    setCurrentTime(target.time);
    setPlaying(false);
    if (target.engagementId) setSelection({ kind: "engagement", engagementId: target.engagementId });
  };
  const renderPlayerPanel = (player: (typeof replay.players)[number], side: "left" | "right") => {
    const stats = currentFrame?.stats[String(player.id)];
    const opponent = replay.players.find((candidate) => candidate.id !== player.id);
    const opponentStats = opponent ? currentFrame?.stats[String(opponent.id)] : undefined;
    const supplyUsed = stats?.supplyUsed ?? 0;
    const supplyCap = Math.max(1, stats?.supplyCap ?? 0);
    const production = currentFrame?.production[String(player.id)] ?? [];
    const completedUpgrades = replay.timeline
      .filter((event) => event.type === "upgrade" && event.playerId === player.id && event.time <= currentTime)
      .slice(-3);
    const armyValueDelta = (stats?.armyValue ?? 0) - (opponentStats?.armyValue ?? 0);
    const workerDelta = (stats?.workers ?? 0) - (opponentStats?.workers ?? 0);
    const deltaClass = (value: number) => value > 0 ? "leading" : value < 0 ? "trailing" : "tied";
    return (
      <aside className={`stats-panel macro-panel player-side player-side-${side}`}>
        <div className="panel-heading"><span>PLAYER {side === "left" ? "1" : "2"}</span><Activity size={15} /></div>
        <section className="macro-player side-macro-player" style={{ "--player-color": player.color } as React.CSSProperties}>
          <div className="side-player-identity">
            <span><i />{player.name}</span>
            <small>{player.race}</small>
          </div>
          <div className="macro-player-title"><span>{t("watcher.supply")}</span><b>{supplyUsed}<small>/ {supplyCap}</small></b></div>
          <div className="supply-track"><i style={{ width: `${Math.min(100, (supplyUsed / supplyCap) * 100)}%` }} /></div>
          <div className="macro-metrics side-macro-metrics">
            <div><small>{t("watcher.army")}</small><strong>{stats?.armySupply ?? 0} <em>supply</em></strong><span>{stats?.armyUnits ?? 0} {t("watcher.units")} · {compactNumber(stats?.armyValue ?? 0)} <em className={`metric-delta ${deltaClass(armyValueDelta)}`} title={t("watcher.armyValueDelta")}>{signedCompactNumber(armyValueDelta)}</em></span></div>
            <div><small>{t("watcher.workers")}</small><strong>{stats?.workers ?? 0}</strong><span>{compactNumber(stats?.mineralRate ?? 0)} <Pickaxe size={9} /> · {compactNumber(stats?.vespeneRate ?? 0)} <Zap size={9} /> <em className={`metric-delta ${deltaClass(workerDelta)}`} title={t("watcher.workerDelta")}>{signedCompactNumber(workerDelta)}</em></span></div>
          </div>
          <div className="combat-ledger">
            <span>{t("watcher.inProgress")} <b>{compactNumber(stats?.armyInProgress ?? 0)}</b></span>
            <span>{t("watcher.lost")} <b>{compactNumber(stats?.armyLost ?? 0)}</b></span>
            <span>{t("watcher.killed")} <b>{compactNumber(stats?.resourcesKilled ?? 0)}</b></span>
          </div>
          {completedUpgrades.length > 0 && (
            <div className="tech-state">
              <span><FlaskConical size={10} />{t("watcher.completedUpgrades")}</span>
              <div>{completedUpgrades.map((upgrade, index) => <b key={`${upgrade.time}-${upgrade.label}-${index}`} title={`${formatTime(upgrade.time)} · ${cleanType(upgrade.label)}`}>{cleanType(upgrade.label)}</b>)}</div>
            </div>
          )}
          <div className="production-list side-production-list">
            <div className="production-title"><span><Factory size={11} /> {t("watcher.production")}</span><b>{production.length}</b></div>
            {production.length === 0 ? <small className="queue-empty">{t("watcher.queueEmpty")}</small> : production.slice(0, 8).map((order) => (
              <div className="production-order" key={order.id} title={`${order.ability} · ${order.confidence}`}>
                <span>{cleanType(order.product)}</span>
                <b>{order.queued ? t("watcher.queued") : `${Math.round(order.progress * 100)}%`}</b>
                <i><em style={{ width: `${order.progress * 100}%` }} /></i>
              </div>
            ))}
            {production.length > 8 && <small className="queue-more">+{production.length - 8} {t("watcher.more")}</small>}
          </div>
        </section>
      </aside>
    );
  };
  const renderSelectionInspector = () => {
    if (selectedEngagement) {
      const totalLoss = Object.values(selectedEngagement.losses).reduce((sum, value) => sum + value, 0);
      const efficiencyLeaderId = Object.entries(selectedEngagement.tradeEfficiency ?? {}).sort((left, right) => right[1] - left[1])[0]?.[0];
      const tradeLeader = playerById.get(efficiencyLeaderId != null ? Number(efficiencyLeaderId) : selectedEngagement.winnerId ?? 0);
      return (
        <aside className="selection-inspector engagement-inspector" style={{ "--selection-color": tradeLeader?.color ?? "#e88a58" } as React.CSSProperties}>
          <header>
            <span className="selection-icon"><Flame size={15} /></span>
            <div><small>{t("watcher.combatReview")}</small><strong>{t("watcher.engagement")}</strong><em>{formatTime(selectedEngagement.start)}–{formatTime(selectedEngagement.end)} · {Math.max(0, Math.round(selectedEngagement.end - selectedEngagement.start))}s</em></div>
            <button onClick={() => setSelection(null)} aria-label={t("watcher.closeInspector")}><X size={14} /></button>
          </header>
          <section className="inspector-economy single-economy">
            <div><small>{t("watcher.totalLosses")}</small><strong>{compactNumber(totalLoss)}</strong></div>
            <span><b>{selectedEngagement.participants.length}</b> {t("watcher.players")}</span>
            <span><b>{Object.values(selectedEngagement.unitsLost).reduce((sum, value) => sum + value, 0)}</b> {t("watcher.units")}</span>
          </section>
          <section className="inspector-section engagement-breakdown">
            <h3><Swords size={11} />{t("watcher.lossesByPlayer")}</h3>
            {selectedEngagement.participants.map((playerId) => {
              const player = playerById.get(playerId);
              const loss = selectedEngagement.losses[String(playerId)] ?? 0;
              const unitsLost = selectedEngagement.unitsLost[String(playerId)] ?? 0;
              const minerals = selectedEngagement.mineralLosses?.[String(playerId)];
              const vespene = selectedEngagement.vespeneLosses?.[String(playerId)];
              const supply = selectedEngagement.supplyLost?.[String(playerId)];
              const efficiency = selectedEngagement.tradeEfficiency?.[String(playerId)];
              const detail = minerals != null && vespene != null
                ? `${compactNumber(minerals)} M · ${compactNumber(vespene)} G · ${supply ?? 0} ${t("watcher.supply")} · ${unitsLost} ${t("watcher.unitsLost")}`
                : `${unitsLost} ${t("watcher.unitsLost")}`;
              return <div key={playerId} style={{ "--combat-color": player?.color ?? "#7b8794" } as React.CSSProperties}><span><i />{player?.name ?? playerId}</span><strong>{compactNumber(loss)}{efficiency != null && <em>×{efficiency.toFixed(2)}</em>}</strong><small>{detail}</small></div>;
            })}
          </section>
          {tradeLeader && <section className="trade-leader"><small>{t("watcher.tradeAdvantage")}</small><strong><i style={{ background: tradeLeader.color }} />{tradeLeader.name}</strong><span>{t("watcher.estimatedFromLosses")}</span></section>}
        </aside>
      );
    }
    if (!selection || inspectedUnits.length === 0) return null;
    const isGroup = selection.kind === "group";
    const primaryUnit = inspectedUnits[0];
    const visual = unitVisual(primaryUnit);
    const SelectionIcon = isGroup ? ListTree : visual.icon;
    const title = isGroup
      ? (selection.groupType === "base" ? t("watcher.baseGroup") : selection.groupType === "workers" ? t("watcher.workerGroup") : selection.groupType === "structures" ? t("watcher.structureGroup") : selection.groupType === "resources" ? t("watcher.resourceGroup") : t("watcher.unitGroup"))
      : cleanType(primaryUnit.type);
    const activityLabel = primaryUnit.activity === "moving"
      ? t("watcher.moving")
      : primaryUnit.activity === "harvesting" ? t("watcher.harvesting") : t("watcher.idle");

    return (
      <aside className="selection-inspector" style={{ "--selection-color": inspectedPlayer?.color ?? "#7b8794" } as React.CSSProperties}>
        <header>
          <span className="selection-icon"><SelectionIcon size={15} /></span>
          <div><small>{t("watcher.inspector")}</small><strong>{title}</strong><em>{inspectedPlayer?.name ?? t("watcher.unknownPlayer")} · {isGroup ? `${inspectedUnits.length} ${t("watcher.units")}` : cleanType(primaryUnit.category)}</em></div>
          <button onClick={() => setSelection(null)} aria-label={t("watcher.closeInspector")}><X size={14} /></button>
        </header>

        {isGroup ? (
          <>
            <section className="inspector-economy">
              <div><small>{t("watcher.economicValue")}</small><strong>{compactNumber(inspectedMinerals + inspectedVespene)}</strong></div>
              <span><b>{compactNumber(inspectedMinerals)}</b> <Pickaxe size={10} /></span>
              <span><b>{compactNumber(inspectedVespene)}</b> <Zap size={10} /></span>
              <span><b>{inspectedSupply}</b> {t("watcher.supply")}</span>
            </section>
            <section className="inspector-section confidence-section">
              <h3><Shield size={11} />{t("watcher.positionConfidence")}</h3>
              <div>
                {(["recorded", "derived", "estimated"] as const).map((source) => (
                  <span key={source} className={source}><i style={{ width: `${(confidenceCounts[source] / inspectedUnits.length) * 100}%` }} /><b>{t(`watcher.confidence.${source}`)}</b><em>{confidenceCounts[source]}</em></span>
                ))}
              </div>
            </section>
            <section className="inspector-section composition-section">
              <h3><ListTree size={11} />{t("watcher.composition")}</h3>
              {composition.map((item) => {
                const member = inspectedUnits.find((unit) => unit.type === item.type) ?? primaryUnit;
                const MemberIcon = unitVisual(member).icon;
                return <div className="composition-row" key={item.type}><span><MemberIcon size={10} /><b>{cleanType(item.type)}</b></span><strong>×{item.count}</strong><small>{compactNumber(item.minerals)} <Pickaxe size={8} /> · {compactNumber(item.vespene)} <Zap size={8} /></small></div>;
              })}
            </section>
          </>
        ) : (
          <>
            <section className="inspector-economy single-economy">
              <div><small>{t("watcher.economicValue")}</small><strong>{compactNumber(inspectedMinerals + inspectedVespene)}</strong></div>
              <span><b>{compactNumber(inspectedMinerals)}</b> <Pickaxe size={10} /></span>
              <span><b>{compactNumber(inspectedVespene)}</b> <Zap size={10} /></span>
              <span><b>{inspectedSupply}</b> {t("watcher.supply")}</span>
            </section>
            {selectedAddon && <section className="inspector-addon"><span><Wrench size={11} />{t("watcher.addon")}</span><strong>{cleanType(selectedAddon.type)}</strong><small>{selectedAddon.completed ? t("watcher.completed") : t("watcher.underConstruction")}</small></section>}
            {primaryUnit.isBuilding && (
              <section className="inspector-section inspector-production">
                <h3><Factory size={11} />{t("watcher.producingNow")}<em>{primaryUnit.completed ? t("watcher.completed") : t("watcher.underConstruction")}</em></h3>
                {selectedProduction.length === 0 ? <p>{t("watcher.noProductionHere")}</p> : selectedProduction.map((order) => (
                  <div className="inspector-order" key={order.id}><span><b>{cleanType(order.product)}</b><small>{order.queued ? t("watcher.queued") : `${Math.round(order.progress * 100)}%`}</small></span><i><em style={{ width: `${order.progress * 100}%` }} /></i></div>
                ))}
              </section>
            )}
            <section className="inspector-section position-section">
              <h3><Target size={11} />{t("watcher.position")}</h3>
              <div><span>X <b>{primaryUnit.x.toFixed(1)}</b></span><span>Y <b>{primaryUnit.y.toFixed(1)}</b></span><span>{activityLabel}</span></div>
              <small>{t("watcher.positionConfidence")}: {primaryUnit.positionSource}</small>
            </section>
          </>
        )}
      </aside>
    );
  };

  return (
    <div className="app-shell watcher-shell">
      <main className="watcher-main">
        <section className="workspace" aria-label="Visualizador do replay">
          <div className="matchbar">
            <div className="map-title"><div className="map-icon"><MapIcon size={20} /></div><div><small>{t("watcher.map")} · {t(hasMapGeometry ? "watcher.geometricMap" : "watcher.proceduralMap")}</small><strong>{replay.meta.map}</strong></div></div>
            <div className="versus">
              {replay.players.slice(0, 2).map((player, index) => (
                <div className="player" key={player.id}>
                  {index === 1 && <span className="vs">VS</span>}
                  <span className="race-dot" style={{ background: player.color, boxShadow: `0 0 14px ${player.color}` }} />
                  <div className={index === 1 ? "align-right" : ""}><strong>{player.name}</strong><small>{player.race}</small></div>
                </div>
              ))}
            </div>
            <div className="match-meta"><small>{replay.meta.filename}</small><strong><Clock3 size={15} /> {formatTime(replay.meta.duration)}</strong></div>
            <div className="compact-scoreboard" aria-label={t("watcher.compactScoreboard")}>
              {replay.players.slice(0, 2).map((player, index) => {
                const stats = currentFrame?.stats[String(player.id)];
                return (
                  <section key={player.id} style={{ "--player-color": player.color } as React.CSSProperties}>
                    <header><span>P{index + 1}</span><strong>{player.name}</strong><small>{player.race}</small></header>
                    <div>
                      <span title={t("watcher.supply")}><Package size={10} />{stats?.supplyUsed ?? 0}/{stats?.supplyCap ?? 0}</span>
                      <span title={t("watcher.workers")}><Pickaxe size={10} />{stats?.workers ?? 0}</span>
                      <span title={t("watcher.armyValue")}><Swords size={10} />{compactNumber(stats?.armyValue ?? 0)}</span>
                      <span title={t("watcher.bank")}><Database size={10} />{compactNumber((stats?.minerals ?? 0) + (stats?.vespene ?? 0))}</span>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="viewer-grid macro-viewer-grid">
            {replay.players[0] && renderPlayerPanel(replay.players[0], "left")}

            <div
              className={`map-stage ${isPanning ? "is-panning" : ""}`}
              onWheel={(event) => {
                event.preventDefault();
                setZoom((value) => Math.min(3, Math.max(0.7, value - event.deltaY * 0.001)));
              }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
                setIsPanning(true);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!drag.current) return;
                setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y });
              }}
              onPointerUp={() => { drag.current = null; setIsPanning(false); }}
              onPointerCancel={() => { drag.current = null; setIsPanning(false); }}
            >
              <div
                className={`map-canvas ${mapMode}`}
                style={{ "--map-aspect": mapAspect, transform: mapMode !== "procedural"
                  ? `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`
                  : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` } as React.CSSProperties}
              >
                {layers.terrain && hasMapGeometry && <TerrainLayer geometry={replay.mapGeometry} />}
                {layers.terrain && <div className={`map-grid ${hasMapGeometry ? "over-terrain" : ""}`} />}
                {currentFrame?.deaths.map((death) => {
                  const point = toPercent(death.x, death.y);
                  const color = playerById.get(death.ownerId)?.color ?? "#ff7180";
                  return <div key={`heat-${death.id}-${death.time}`} className="combat-heat" style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, background: color }} />;
                })}
                {layers.cameras && cameraTrail.map((camera) => {
                  const point = toPercent(camera.x, camera.y);
                  const color = playerById.get(camera.playerId)?.color ?? "#8edcff";
                  return <i key={`camera-trail-${camera.playerId}-${camera.frameTime}`} className="camera-trail-dot" style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, background: color, opacity: camera.opacity * .42, "--camera-color": color } as React.CSSProperties} />;
                })}
                {layers.cameras && renderedCameras.map((camera) => {
                  const point = toPercent(camera.x, camera.y);
                  const player = playerById.get(camera.playerId);
                  const color = player?.color ?? "#8edcff";
                  const playerNumber = Math.max(1, replay.players.findIndex((candidate) => candidate.id === camera.playerId) + 1);
                  return <div key={`camera-${camera.playerId}`} className="camera-focus" style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, color, "--camera-color": color } as React.CSSProperties} title={`${t("watcher.cameraFocus")} · ${player?.name ?? camera.playerId} · X ${camera.x.toFixed(1)} Y ${camera.y.toFixed(1)}`}><span><Scan size={10} />P{playerNumber}</span><small>{player?.name}</small></div>;
                })}
                {selectedUnit?.targetX != null && selectedUnit.targetY != null && (
                  <svg className="route-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line
                      x1={toPercent(selectedUnit.x, selectedUnit.y).left}
                      y1={100 - toPercent(selectedUnit.x, selectedUnit.y).bottom}
                      x2={toPercent(selectedUnit.targetX, selectedUnit.targetY).left}
                      y2={100 - toPercent(selectedUnit.targetX, selectedUnit.targetY).bottom}
                    />
                  </svg>
                )}
                {visibleEngagements.map((engagement) => {
                  const point = toPercent(engagement.x, engagement.y);
                  const totalLoss = Object.values(engagement.losses).reduce((sum, value) => sum + value, 0);
                  return <button key={engagement.id} className={`engagement-marker ${selectedEngagement?.id === engagement.id ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%` }} onClick={() => { setCurrentTime(engagement.start); setPlaying(false); setSelection({ kind: "engagement", engagementId: engagement.id }); }} title={`${t("watcher.engagement")} · ${compactNumber(totalLoss)}`}><Flame size={10} /><b>{compactNumber(totalLoss)}</b></button>;
                })}
                {showBaseMarkers && (currentFrame?.bases ?? []).map((base) => {
                  const point = toPercent(base.x, base.y);
                  const color = playerById.get(base.ownerId)?.color ?? "#8295a5";
                  const memberIds = renderedUnits.filter((unit) => unit.baseId === base.id || unit.id === base.townHallId).map((unit) => unit.id);
                  const isSelected = selection?.kind === "group" && selection.groupType === "base" && memberIds.every((id) => selection.unitIds.includes(id));
                  return <button key={base.id} className={`base-marker ${base.status} ${isSelected ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, borderColor: color, color, "--cluster-color": color } as React.CSSProperties} onClick={() => setSelection(isSelected ? null : { kind: "group", groupType: "base", unitIds: memberIds })} title={`${t("watcher.base")} · ${base.workers} ${t("watcher.workers")} · ${base.structures} ${t("watcher.structures")}`}><Landmark size={10} /><b>{layers.workers ? base.workers : "–"}</b><small>{base.structures}</small></button>;
                })}
                {semanticArmyClusters.map((cluster) => {
                  const point = toPercent(cluster.x, cluster.y);
                  const color = playerById.get(cluster.ownerId)?.color ?? "#8295a5";
                  const typeCounts = new Map<string, number>();
                  for (const unit of cluster.units) typeCounts.set(unit.type, (typeCounts.get(unit.type) ?? 0) + 1);
                  const dominantType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
                  const dominantUnit = cluster.units.find((unit) => unit.type === dominantType) ?? cluster.units[0];
                  const ClusterIcon = unitVisual(dominantUnit).icon;
                  const isSelected = selection?.kind === "group" && selection.groupType === "army" && cluster.units.every((unit) => selection.unitIds.includes(unit.id));
                  return <button key={cluster.id} className={`army-cluster ${isSelected ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, borderColor: color, color, "--cluster-color": color } as React.CSSProperties} onClick={() => setSelection(isSelected ? null : { kind: "group", groupType: "army", unitIds: cluster.units.map((unit) => unit.id) })} title={`${cluster.units.length} ${t("watcher.armyUnits")} · ${cleanType(dominantUnit.type)}`}><ClusterIcon size={11} /><b>{cluster.units.length}</b></button>;
                })}
                {workerClusters.map((cluster) => {
                  const point = toPercent(cluster.x, cluster.y);
                  const color = playerById.get(cluster.ownerId)?.color ?? "#8295a5";
                  const isSelected = selection?.kind === "group" && selection.groupType === "workers" && cluster.units.every((unit) => selection.unitIds.includes(unit.id));
                  return <button key={cluster.id} className={`worker-cluster ${isSelected ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, borderColor: color, color, "--cluster-color": color } as React.CSSProperties} onClick={() => setSelection(isSelected ? null : { kind: "group", groupType: "workers", unitIds: cluster.units.map((unit) => unit.id) })} title={`${cluster.units.length} ${t("watcher.workers")}`}><Pickaxe size={9} /><b>{cluster.units.length}</b></button>;
                })}
                {structureClusters.map((cluster) => {
                  const point = toPercent(cluster.x, cluster.y);
                  const color = playerById.get(cluster.ownerId)?.color ?? "#8295a5";
                  const isSelected = selection?.kind === "group" && selection.groupType === "structures" && cluster.units.every((unit) => selection.unitIds.includes(unit.id));
                  return <button key={cluster.id} className={`structure-cluster ${isSelected ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, borderColor: color, color, "--cluster-color": color } as React.CSSProperties} onClick={() => setSelection(isSelected ? null : { kind: "group", groupType: "structures", unitIds: cluster.units.map((unit) => unit.id) })} title={`${cluster.units.length} ${t("watcher.structures")}`}><Factory size={9} /><b>{cluster.units.length}</b></button>;
                })}
                {resourceClusters.map((cluster) => {
                  const point = toPercent(cluster.x, cluster.y);
                  const isSelected = selection?.kind === "group" && selection.groupType === "resources" && cluster.units.every((unit) => selection.unitIds.includes(unit.id));
                  return <button key={cluster.id} className={`resource-cluster ${isSelected ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%` }} onClick={() => setSelection(isSelected ? null : { kind: "group", groupType: "resources", unitIds: cluster.units.map((unit) => unit.id) })} title={`${cluster.units.length} ${t("watcher.layer.resources")}`}><Database size={8} /><b>{cluster.units.length}</b></button>;
                })}
                {individualUnits.map((unit) => {
                  const player = playerById.get(unit.ownerId);
                  const visual = unitVisual(unit);
                  const UnitIcon = visual.icon;
                  const addon = attachedAddonByParent.get(unit.id);
                  const resourceColor = unit.type.toLowerCase().includes("vespene") ? "#54b994" : "#73bde0";
                  const color = unit.category === "resource" ? resourceColor : player?.color ?? "#7b8794";
                  const point = toPercent(unit.x, unit.y);
                  const productionCount = (productionByProducer.get(unit.id) ?? 0) + (addon ? productionByProducer.get(addon.id) ?? 0 : 0);
                  return (
                    <button
                      key={unit.id}
                      className={`unit ${unit.category} role-${visual.kind} ${unit.activity} ${unit.isTownHall ? "town-hall" : ""} ${unit.positionSource === "estimated" ? "estimated" : ""} ${selectedUnitId === unit.id ? "selected" : ""}`}
                      style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, borderColor: color, background: unit.isBuilding || visual.kind === "air" ? `${color}33` : color, boxShadow: `0 0 ${unit.isBuilding ? 10 : 7}px ${color}66`, "--unit-color": color, "--heading": `${unit.heading}deg` } as React.CSSProperties}
                      title={`${cleanType(unit.type)}${addon ? ` + ${cleanType(addon.type)}` : ""} • ${player?.name ?? t("watcher.unknownPlayer")} • ${unit.activity} • ${unit.positionSource}`}
                      aria-label={`${cleanType(unit.type)} · ${player?.name ?? t("watcher.unknownPlayer")}`}
                      onClick={() => setSelection((current) => current?.kind === "unit" && current.unitId === unit.id ? null : { kind: "unit", unitId: unit.id })}
                    >
                      {unit.category !== "resource" && <UnitIcon aria-hidden="true" />}
                      {addon && <b className={`addon-badge ${addon.type.toLowerCase().includes("reactor") ? "reactor" : "tech-lab"}`} title={cleanType(addon.type)}>{addon.type.toLowerCase().includes("reactor") ? "R" : "T"}</b>}
                      {productionCount > 0 && <b className="production-badge">{productionCount}</b>}
                    </button>
                  );
                })}
              </div>
              <div className="map-vignette" />
              {renderSelectionInspector()}
              <div className="general-state">
                <strong>{formatTime(currentTime)}</strong><small>/ {formatTime(replay.meta.duration)}</small>
                <i />
                <span><Swords size={12} />{combatUnits}</span>
                <span><Hammer size={12} />{workers}</span>
                <span><Factory size={12} />{structures}</span>
                <span><Flame size={12} />{currentFrame?.deaths.length ?? 0}</span>
              </div>
              <div className="map-toolbar" role="toolbar" aria-label={t("watcher.mapLayers")}>
                {(["terrain", "army", "workers", "buildings", "resources", "cameras"] as LayerKey[]).map((layer) => (
                  <button key={layer} className={layers[layer] ? "active" : ""} aria-pressed={layers[layer]} onClick={() => toggleLayer(layer)} title={layerLabels[layer]}>
                    {layers[layer] ? <Eye size={12} /> : <EyeOff size={12} />}<span>{layerLabels[layer]}</span>
                  </button>
                ))}
                <i />
                <button onClick={() => setZoom((value) => Math.max(0.7, value - 0.25))} aria-label={t("watcher.zoomOut")}><Minus size={13} /></button>
                <b>{Math.round(zoom * 100)}%</b>
                <button onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label={t("watcher.zoomIn")}><Plus size={13} /></button>
                <button onClick={resetMap} aria-label={t("watcher.resetMap")}><Target size={13} /></button>
              </div>
              {nextEvent && <div className="next-event"><small>{t("watcher.nextEvent")} · {formatTime(nextEvent.time)}</small><strong>{nextEvent.type === "upgrade" ? t("watcher.upgrade") : nextEvent.type === "base" ? t("watcher.newBase") : nextEvent.type === "engagement" ? t("watcher.engagement") : nextEvent.type === "supply" ? t("watcher.supplyBlock") : t("watcher.majorMovement")} · {cleanType(nextEvent.label)}</strong></div>}
              <div className="reconstruction-status"><i /><span><strong>{t(replay.meta.capabilities.mapNavigation ? "watcher.routedMovement" : "watcher.reconstructedMovement")}</strong><small>{compactNumber(replay.meta.capabilities.mapNavigation ? replay.meta.routedSegments : replay.meta.movementOrders)} {t(replay.meta.capabilities.mapNavigation ? "watcher.routedHint" : "watcher.reconstructedHint")}</small></span></div>
              <div className="coordinates">X {Math.round(bounds.minX)}–{Math.round(bounds.maxX)} · Y {Math.round(bounds.minY)}–{Math.round(bounds.maxY)}</div>
            </div>
            {replay.players[1] && renderPlayerPanel(replay.players[1], "right")}
          </div>

          <div className="controls">
            <button className="icon-button" onClick={() => { setCurrentTime(0); setPlaying(false); }} aria-label={t("watcher.restart")}><RotateCcw size={17} /></button>
            <button className="play-button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? t("watcher.pause") : t("watcher.play")}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
            <div className="event-nav">
              <button onClick={() => seekRelevantEvent(-1)} aria-label={t("watcher.previousEvent")} title={t("watcher.previousEvent")}><SkipBack size={13} /></button>
              <button onClick={() => seekRelevantEvent(1)} aria-label={t("watcher.nextRelevantEvent")} title={t("watcher.nextRelevantEvent")}><SkipForward size={13} /></button>
            </div>
            <span className="control-time">{formatTime(currentTime)}</span>
            <div className="timeline-shell">
              <input className="timeline" aria-label="Tempo do replay" type="range" min="0" max={replay.meta.duration} step="0.1" value={currentTime} onChange={(event) => setCurrentTime(Number(event.target.value))} style={{ "--progress": `${(currentTime / replay.meta.duration) * 100}%` } as React.CSSProperties} />
              <div className="timeline-events" aria-label={t("watcher.analyticTimeline")}>
                {replay.timeline.filter((event) => event.time > 0).map((event, index) => {
                  const intervalEnd = event.end != null ? Math.min(replay.meta.duration, Math.max(event.time, event.end)) : null;
                  const intervalWidth = intervalEnd != null ? ((intervalEnd - event.time) / replay.meta.duration) * 100 : null;
                  const label = `${formatTime(event.time)}${intervalEnd != null ? `–${formatTime(intervalEnd)}` : ""} · ${cleanType(event.label)}`;
                  return <button key={`${event.type}-${event.time}-${index}`} aria-label={label} className={`timeline-event ${event.type} ${intervalWidth != null ? "interval" : ""}`} style={{ left: `${(event.time / replay.meta.duration) * 100}%`, width: intervalWidth != null ? `max(2px, ${intervalWidth}%)` : undefined }} onClick={() => { setCurrentTime(event.time); setPlaying(false); if (event.engagementId) setSelection({ kind: "engagement", engagementId: event.engagementId }); }} title={label} />;
                })}
              </div>
            </div>
            <span className="control-time muted">{formatTime(replay.meta.duration)}</span>
            <label className="speed"><FastForward size={15} /><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label={t("watcher.speed")}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select><ChevronDown size={14} /></label>
          </div>
        </section>
      </main>
    </div>
  );
}
