"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Ambulance,
  ArrowLeft,
  Bird,
  Bomb,
  Bot,
  Boxes,
  Bug,
  ChevronDown,
  CircleDot,
  Clock3,
  Crosshair,
  Cog,
  Crown,
  Database,
  Eye,
  EyeOff,
  Factory,
  FastForward,
  FileUp,
  Flame,
  FlaskConical,
  Footprints,
  Hammer,
  Home,
  Gem,
  CircleHelp,
  Landmark,
  ListTree,
  Map as MapIcon,
  Minus,
  Package,
  Pause,
  Pickaxe,
  Plane,
  Play,
  Plus,
  Radar,
  RotateCcw,
  Rocket,
  Shield,
  Scan,
  SkipBack,
  SkipForward,
  Sparkles,
  Skull,
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
import { canonicalSc2Type, sc2CategoryName, sc2IconKey, sc2Name, sc2StateName, type Sc2IconKey } from "@/lib/sc2-catalog";
import type { ReplayCamera, ReplayProduction, ReplayUnit } from "@/lib/types";

type LayerKey = "terrain" | "army" | "workers" | "buildings" | "resources" | "cameras";
type ComparisonView = "composition" | "upgrades";
type MapSelection =
  | { kind: "unit"; unitId: number }
  | { kind: "engagement"; engagementId: string }
  | { kind: "group"; groupType: "army" | "base" | "workers" | "structures" | "resources"; unitIds: number[] };

function formatTime(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

function formatCompactNumber(value: number, locale: "pt" | "en") {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatSignedCompactNumber(value: number, locale: "pt" | "en") {
  if (value === 0) return "±0";
  return `${value > 0 ? "+" : "−"}${formatCompactNumber(Math.abs(value), locale)}`;
}

function formatLocaleNumber(value: number, locale: "pt" | "en") {
  return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "en-US", { maximumFractionDigits: 1 }).format(value);
}

function InfoTip({ label, side = "left", children }: { label: string; side?: "left" | "right"; children: React.ReactNode }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const show = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 220;
    const left = side === "left"
      ? Math.min(window.innerWidth - width - 10, rect.right + 8)
      : Math.max(10, rect.left - width - 8);
    setPosition({ left, top: Math.max(10, Math.min(window.innerHeight - 170, rect.top - 4)) });
  };
  useEffect(() => {
    if (!position) return;
    const dismiss = () => setPosition(null);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [position]);
  return (
    <span ref={triggerRef} className={`info-tip info-tip-${side}`} tabIndex={0} aria-label={label} aria-describedby={position ? tooltipId : undefined} onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)} onKeyDown={(event) => { if (event.key === "Escape") { setPosition(null); event.currentTarget.blur(); } }}>
      <CircleHelp size={11} aria-hidden="true" />
      {position && typeof document !== "undefined" && createPortal(<span id={tooltipId} className="info-tip-card" role="tooltip" style={position}><b>{label}</b><small>{children}</small></span>, document.body)}
    </span>
  );
}

function cameraSamplesBetween(samples: ReplayCamera[], start: number, end: number) {
  const lowerBound = (target: number) => {
    let low = 0;
    let high = samples.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (samples[middle].recordedAt < target) low = middle + 1;
      else high = middle;
    }
    return low;
  };
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].recordedAt <= end) low = middle + 1;
    else high = middle;
  }
  const startIndex = lowerBound(start);
  return samples.slice(startIndex, low).map((sample, index) => ({
    ...sample,
    trackIndex: startIndex + index,
  }));
}

type UnitVisual = {
  kind: "addon" | "air" | "army" | "creep-node" | "defense" | "gas" | "production" | "resource" | "supply" | "tech" | "town-hall" | "worker";
  icon: LucideIcon;
};

const sc2Icons: Record<Sc2IconKey, LucideIcon> = {
  aircraft: Plane, capital: Rocket, caster: Sparkles, command: Crown, detector: Eye,
  energy: Zap, explosive: Bomb, flame: Flame, flyer: Bird, heavy: Shield,
  massive: Skull, mechanical: Bot, medic: Ambulance, melee: Swords, production: Factory,
  resource: Database, scout: Footprints, siege: Crosshair, stealth: EyeOff, supply: Package,
  swarm: Bug, target: Target, tech: FlaskConical, "town-hall": Landmark, transport: Boxes, worker: Pickaxe,
};

function hudEntityIcon(value: string): LucideIcon {
  return sc2Icons[sc2IconKey(value)];
}

function unitVisual(unit: ReplayUnit): UnitVisual {
  const type = unit.type.toLowerCase().replaceAll(/[^a-z0-9]/g, "");

  if (unit.category === "resource") return { kind: "resource", icon: Database };
  if (type.includes("creeptumor")) return { kind: "creep-node", icon: CircleDot };
  if (type.includes("techlab") || type.includes("reactor")) return { kind: "addon", icon: Wrench };
  if (unit.isTownHall) return { kind: "town-hall", icon: Landmark };
  if (unit.category === "worker") return { kind: "worker", icon: Pickaxe };

  if (unit.isBuilding) {
    if (/missileturret|sensortower/.test(type)) return { kind: "defense", icon: Radar };
    if (/sporecrawler|spinecrawler|bunker|photoncannon|shieldbattery/.test(type)) return { kind: "defense", icon: Shield };
    if (/supplydepot|pylon/.test(type)) return { kind: "supply", icon: Package };
    if (/refinery|extractor|assimilator/.test(type)) return { kind: "gas", icon: Database };
    if (/barracks|factory|starport|gateway|warpgate|roboticsfacility|stargate|spawningpool|roachwarren|banelingnest|hydraliskden|nydus/.test(type)) return { kind: "production", icon: Factory };
    if (/techlab|reactor|engineeringbay|armory|ghostacademy|fusioncore|evolutionchamber|infestationpit|ultraliskcavern|spire|templararchive|cyberneticscore|forge/.test(type)) return { kind: "tech", icon: FlaskConical };
    return { kind: "tech", icon: Home };
  }
  const icon = hudEntityIcon(unit.type);
  const airborne = /overlord|overseer|medivac|viking|liberator|banshee|raven|battlecruiser|mutalisk|corruptor|broodlord|viper|phoenix|oracle|voidray|carrier|tempest|mothership|observer|warpprism|flying/.test(type);
  return { kind: airborne ? "air" : "army", icon };
}

function raceIcon(race: string): LucideIcon {
  if (race.toLowerCase() === "zerg") return Bug;
  if (race.toLowerCase() === "protoss") return Gem;
  return Cog;
}

export function ReplayViewer() {
  const { replay } = useReplay();
  const { locale, t } = useI18n();
  const entityName = (type: string) => sc2Name(type, locale);
  const compactNumber = (value: number) => formatCompactNumber(value, locale);
  const signedCompactNumber = (value: number) => formatSignedCompactNumber(value, locale);
  const number = (value: number) => formatLocaleNumber(value, locale);
  const activityName = (activity: ReplayUnit["activity"]) => activity === "moving" ? t("watcher.moving") : activity === "harvesting" ? t("watcher.harvesting") : t("watcher.idle");
  const productionProgress = (order: ReplayProduction) => {
    if (order.queued) return 0;
    const duration = order.completesAt - order.startedAt;
    const progress = duration > 0
      ? (currentTime - order.startedAt) / duration
      : order.progress;
    return Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  };
  const productionRemaining = (order: ReplayProduction) => Math.max(0, Math.ceil(order.completesAt - currentTime));
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [compactPlayerId, setCompactPlayerId] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [cameraPlayers, setCameraPlayers] = useState<Record<number, boolean>>({});
  const [timelineHint, setTimelineHint] = useState<{ label: string; position: number } | null>(null);
  const [comparisonView, setComparisonView] = useState<ComparisonView | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    terrain: true,
    army: true,
    workers: true,
    buildings: true,
    resources: true,
    cameras: true,
  });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const currentTimeRef = useRef(0);
  const resumePlaybackRef = useRef(false);

  const openComparison = (view: ComparisonView) => {
    if (comparisonView == null) resumePlaybackRef.current = playing;
    setComparisonView(view);
    setSelection(null);
    setPlaying(false);
  };
  const closeComparison = () => {
    setComparisonView(null);
    setPlaying(resumePlaybackRef.current);
  };

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

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

  const armyAdvantageChart = useMemo(() => {
    if (!replay || replay.players.length < 2 || replay.frames.length < 2) return null;
    const firstId = String(replay.players[0].id);
    const secondId = String(replay.players[1].id);
    const stride = Math.max(1, Math.ceil(replay.frames.length / 220));
    const samples = replay.frames.filter((_, index) => index % stride === 0 || index === replay.frames.length - 1).map((frame) => ({
      x: (frame.time / replay.meta.duration) * 100,
      delta: (frame.stats[firstId]?.armyValue ?? 0) - (frame.stats[secondId]?.armyValue ?? 0),
    }));
    const max = Math.max(1, ...samples.map((sample) => Math.abs(sample.delta)));
    const points = (side: "positive" | "negative") => samples.map((sample) => {
      const delta = side === "positive" ? Math.max(0, sample.delta) : Math.min(0, sample.delta);
      return `${sample.x.toFixed(2)},${(10 - (delta / max) * 8).toFixed(2)}`;
    }).join(" ");
    return { positive: points("positive"), negative: points("negative") };
  }, [replay]);

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
      if (event.code === "Escape" && comparisonView) {
        closeComparison();
        return;
      }
      if (comparisonView) return;
      if (event.code === "Space") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      const seekStep = event.shiftKey ? 1 : 5;
      if (event.code === "ArrowLeft") setCurrentTime((value) => Math.max(0, value - seekStep));
      if (event.code === "ArrowRight") setCurrentTime((value) => Math.min(replay.meta.duration, value + seekStep));
      if (event.code === "BracketLeft" || event.code === "BracketRight") {
        const events = replay.timeline.filter((item) => item.type !== "movement" && item.time > 0);
        const target = event.code === "BracketLeft"
          ? [...events].reverse().find((item) => item.time < currentTimeRef.current - .5)
          : events.find((item) => item.time > currentTimeRef.current + .5);
        if (target) {
          setCurrentTime(target.time);
          setPlaying(false);
          if (target.engagementId) setSelection({ kind: "engagement", engagementId: target.engagementId });
        }
      }
      if (event.code === "Home") {
        event.preventDefault();
        setCurrentTime(0);
        setPlaying(false);
      }
      if (event.code === "End") {
        event.preventDefault();
        setCurrentTime(replay.meta.duration);
        setPlaying(false);
      }
      if (event.code === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replay, comparisonView]);

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
  const playerOneStats = replay.players[0] ? currentFrame?.stats[String(replay.players[0].id)] : undefined;
  const playerTwoStats = replay.players[1] ? currentFrame?.stats[String(replay.players[1].id)] : undefined;
  const playerOneDeltas = {
    armySupply: (playerOneStats?.armySupply ?? 0) - (playerTwoStats?.armySupply ?? 0),
    workers: (playerOneStats?.workers ?? 0) - (playerTwoStats?.workers ?? 0),
    income: ((playerOneStats?.mineralRate ?? 0) + (playerOneStats?.vespeneRate ?? 0)) - ((playerTwoStats?.mineralRate ?? 0) + (playerTwoStats?.vespeneRate ?? 0)),
  };
  const attachedAddonByParent = new Map(
    renderedUnits.filter((unit) => unit.attachmentId != null).map((addon) => [addon.attachmentId as number, addon]),
  );
  const nextEvent = replay.timeline.find((event) => event.time > currentTime && event.type !== "movement");
  const nextEventPlayer = nextEvent ? playerById.get(nextEvent.playerId) : undefined;
  const nextEventKind = nextEvent ? (nextEvent.type === "upgrade" ? t("watcher.upgrade") : nextEvent.type === "base" ? t("watcher.newBase") : nextEvent.type === "engagement" ? t("watcher.engagement") : t("watcher.supplyBlock")) : "";
  const nextEventName = nextEvent ? entityName(nextEvent.label) : "";
  const nextEventDisplay = nextEventKind.toLocaleLowerCase() === nextEventName.toLocaleLowerCase() ? nextEventKind : `${nextEventKind} · ${nextEventName}`;
  const NextEventIcon = nextEvent?.type === "upgrade" ? FlaskConical : nextEvent?.type === "base" ? Landmark : nextEvent?.type === "engagement" ? Flame : Package;
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
  const composition = [...inspectedUnits.reduce((types, unit) => {
    const identity = canonicalSc2Type(unit.type);
    const item = types.get(identity) ?? { type: unit.type, count: 0, minerals: 0, vespene: 0 };
    item.count += 1;
    item.minerals += unit.mineralCost ?? 0;
    item.vespene += unit.vespeneCost ?? 0;
    types.set(identity, item);
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
  const cameraTrail = Object.values(replay.cameraSamples ?? {}).flatMap((samples) => {
    const recent = cameraSamplesBetween(samples, currentTime - 10, currentTime);
    const stride = Math.max(1, Math.ceil(recent.length / 12));
    return recent.filter((_, index) => index % stride === 0).map((camera) => ({
      ...camera,
      opacity: Math.max(.15, 1 - (currentTime - camera.recordedAt) / 10),
    }));
  }).filter((camera) => cameraPlayers[camera.playerId] !== false);
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
  const playerComposition = (playerId: number) => [...(currentFrame?.units ?? [])
    .filter((unit) => unit.ownerId === playerId && unit.isArmy)
    .reduce((types, unit) => {
      const identity = canonicalSc2Type(unit.type);
      const summary = types.get(identity) ?? { type: unit.type, count: 0, minerals: 0, vespene: 0, supply: 0 };
      summary.count += 1;
      summary.minerals += unit.mineralCost;
      summary.vespene += unit.vespeneCost;
      summary.supply += unit.supplyCost;
      types.set(identity, summary);
      return types;
    }, new Map<string, { type: string; count: number; minerals: number; vespene: number; supply: number }>())
    .values()]
    .sort((left, right) => right.supply - left.supply || right.count - left.count || left.type.localeCompare(right.type));

  const renderComparisonOverlay = () => {
    if (!comparisonView) return null;
    const title = comparisonView === "composition" ? t("watcher.armyComposition") : t("watcher.completedUpgrades");
    return (
      <div className="comparison-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeComparison(); }}>
        <section className="comparison-overlay" role="dialog" aria-modal="true" aria-label={title}>
          <header>
            <span>{comparisonView === "composition" ? <Swords size={15} /> : <FlaskConical size={15} />}</span>
            <div><small>{t("watcher.comparisonAt")} {formatTime(currentTime)}</small><strong>{title}</strong></div>
            <button onClick={closeComparison} aria-label={t("watcher.closeComparison")} title={t("watcher.closeComparison")}><X size={15} /></button>
          </header>
          <div className="comparison-players">
            {replay.players.slice(0, 2).map((player, playerIndex) => {
              const RaceIcon = raceIcon(player.race);
              const composition = playerComposition(player.id);
              const upgrades = replay.timeline.filter((event) => event.type === "upgrade" && event.playerId === player.id && event.time <= currentTime);
              return <article className="comparison-player" key={player.id} style={{ "--player-color": player.color } as React.CSSProperties}>
                <div className="comparison-player-title"><span><i />P{playerIndex + 1} · {player.name}</span><small><RaceIcon size={9} />{player.race}</small></div>
                <div className={`comparison-card-grid ${comparisonView}`}>
                  {comparisonView === "composition" && (composition.length === 0
                    ? <p>{t("watcher.noArmyDetected")}</p>
                    : composition.map((item) => {
                      const EntityIcon = hudEntityIcon(item.type);
                      const detail = `${item.count}× ${entityName(item.type)} · ${compactNumber(item.minerals)} ${t("watcher.minerals")} · ${compactNumber(item.vespene)} ${t("watcher.vespene")} · ${number(item.supply)} ${t("watcher.supplyUnit")}`;
                      return <div className="comparison-entity-card" key={canonicalSc2Type(item.type)} tabIndex={0} title={detail} aria-label={detail}><span><EntityIcon size={14} /></span><div><strong>{entityName(item.type)}</strong><small>{compactNumber(item.minerals)} <Pickaxe size={8} /> · {compactNumber(item.vespene)} <Zap size={8} /> · {number(item.supply)} {t("watcher.supplyUnit")}</small></div><b>{item.count}×</b></div>;
                    }))}
                  {comparisonView === "upgrades" && (upgrades.length === 0
                    ? <p>{t("watcher.noUpgradesCompleted")}</p>
                    : upgrades.map((upgrade, index) => <div className="comparison-upgrade-card" key={`${upgrade.time}-${upgrade.label}-${index}`}><span><FlaskConical size={13} /></span><div><strong>{entityName(upgrade.label)}</strong><small>{t("watcher.completedAt")} {formatTime(upgrade.time)}</small></div></div>))}
                </div>
              </article>;
            })}
          </div>
          <footer><span>{t("watcher.replayPausedForComparison")}</span><button onClick={closeComparison}>{t("watcher.closeAndReturn")}</button></footer>
        </section>
      </div>
    );
  };

  const renderPlayerPanel = (player: (typeof replay.players)[number], side: "left" | "right") => {
    const stats = currentFrame?.stats[String(player.id)];
    const opponent = replay.players.find((candidate) => candidate.id !== player.id);
    const opponentStats = opponent ? currentFrame?.stats[String(opponent.id)] : undefined;
    const supplyUsed = stats?.supplyUsed ?? 0;
    const supplyCap = Math.max(1, stats?.supplyCap ?? 0);
    const isSupplyBlocked = supplyCap < 200 && supplyUsed >= supplyCap;
    const activeSupplyBlock = [...replay.timeline].reverse().find((event) => event.type === "supply" && event.playerId === player.id && event.time <= currentTime && (event.end != null ? currentTime <= event.end : isSupplyBlocked));
    const production = currentFrame?.production[String(player.id)] ?? [];
    const armySupplyDelta = (stats?.armySupply ?? 0) - (opponentStats?.armySupply ?? 0);
    const workerDelta = (stats?.workers ?? 0) - (opponentStats?.workers ?? 0);
    const deltaClass = (value: number) => value > 0 ? "leading" : value < 0 ? "trailing" : "tied";
    const RaceIcon = raceIcon(player.race);
    return (
      <aside className={`stats-panel macro-panel player-side player-side-${side}`}>
        <div className="panel-heading"><span>{t("watcher.player")} {side === "left" ? "1" : "2"}</span><Activity size={15} /></div>
        <section className="macro-player side-macro-player" style={{ "--player-color": player.color } as React.CSSProperties}>
          <div className="side-player-identity">
            <span><i />{player.name}</span>
            <small><RaceIcon size={9} />{player.race}</small>
            <InfoTip label={t("watcher.help.playerHud")} side={side}>{t("watcher.help.playerHudText")}</InfoTip>
          </div>
          <div className="macro-player-title"><span>{t("watcher.supply")}<InfoTip label={t("watcher.supply")} side={side}>{t("watcher.help.supply")}</InfoTip>{isSupplyBlocked && <em>{t("watcher.blocked")}{activeSupplyBlock ? ` ${formatTime(currentTime - activeSupplyBlock.time)}` : ""}</em>}</span><b>{number(supplyUsed)}<small>/ {number(supplyCap)}</small></b></div>
          <div className={`supply-track ${isSupplyBlocked ? "blocked" : ""}`}><i style={{ width: `${Math.min(100, (supplyUsed / supplyCap) * 100)}%` }} /></div>
          <div className="hud-section-label"><span><Database size={9} />{t("watcher.bank")}</span><InfoTip label={t("watcher.bank")} side={side}>{t("watcher.help.resources")}</InfoTip></div>
          <div className="resource-bank">
            <span><Pickaxe size={10} /><b>{compactNumber(stats?.minerals ?? 0)}</b><small>{t("watcher.minerals")}</small></span>
            <span><Zap size={10} /><b>{compactNumber(stats?.vespene ?? 0)}</b><small>{t("watcher.vespene")}</small></span>
          </div>
          <div className="macro-metrics side-macro-metrics">
            <div><small className="metric-help-title"><span>{t("watcher.army")}</span><InfoTip label={t("watcher.army")} side={side}>{t("watcher.help.army")}</InfoTip></small><strong>{number(stats?.armySupply ?? 0)} <em>{t("watcher.supplyUnit")}</em><em className={`metric-delta ${deltaClass(armySupplyDelta)}`} title={t("watcher.armySupplyVersusOpponent")}>{signedCompactNumber(armySupplyDelta)}</em></strong><span className="metric-detail"><span>{stats?.armyUnits ?? 0} {t("watcher.units")} · {compactNumber(stats?.armyValue ?? 0)} {t("watcher.valueShort")}</span></span></div>
            <div><small className="metric-help-title"><span>{t("watcher.workers")}</span><InfoTip label={t("watcher.workers")} side={side}>{t("watcher.help.workers")}</InfoTip></small><strong>{stats?.workers ?? 0}<em className={`metric-delta ${deltaClass(workerDelta)}`} title={t("watcher.workerDelta")}>{signedCompactNumber(workerDelta)}</em></strong><span className="metric-detail"><span>{compactNumber(stats?.mineralRate ?? 0)} <Pickaxe size={9} /> · {compactNumber(stats?.vespeneRate ?? 0)} <Zap size={9} /> <small>{t("watcher.perMinute")}</small></span></span></div>
          </div>
          <div className="production-list side-production-list">
            <div className="production-title"><span><Factory size={11} /> {t("watcher.production")}<InfoTip label={t("watcher.production")} side={side}>{t("watcher.help.production")}</InfoTip></span><b>{production.length}</b></div>
            {production.length === 0 ? <small className="queue-empty">{t("watcher.queueEmpty")}</small> : production.slice(0, 8).map((order) => {
              const EntityIcon = hudEntityIcon(order.product);
              const progress = productionProgress(order);
              const remaining = productionRemaining(order);
              const state = order.queued ? t("watcher.queued") : t("watcher.secondsRemaining").replace("{seconds}", number(remaining));
              return <article className="production-order" key={order.id} tabIndex={0} aria-label={`${entityName(order.product)} · ${state}`} title={`${entityName(order.product)} · ${entityName(order.ability)} · ${state}`}>
                <span className="production-icon"><EntityIcon size={12} /></span>
                <span><strong>{entityName(order.product)}</strong><small>{order.queued ? t("watcher.waitingToStart") : t("watcher.inProgress")}</small></span>
                <b>{state}</b>
                <i><em style={{ width: `${progress * 100}%` }} /></i>
              </article>;
            })}
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
                ? `${compactNumber(minerals)} M · ${compactNumber(vespene)} G · ${number(supply ?? 0)} ${t("watcher.supply")} · ${unitsLost} ${t("watcher.unitsLost")}`
                : `${unitsLost} ${t("watcher.unitsLost")}`;
              return <div key={playerId} style={{ "--combat-color": player?.color ?? "#7b8794" } as React.CSSProperties}><span><i />{player?.name ?? playerId}</span><strong>{compactNumber(loss)}{efficiency != null && <em>×{efficiency.toFixed(2)}</em>}</strong><small>{detail}</small></div>;
            })}
          </section>
          {tradeLeader && <section className="trade-leader"><small>{t("watcher.tradeAdvantage")}<InfoTip label={t("watcher.tradeAdvantage")} side="right">{t("watcher.help.tradeAdvantage")}</InfoTip></small><strong><i style={{ background: tradeLeader.color }} />{tradeLeader.name}</strong><span>{t("watcher.estimatedFromLosses")}</span></section>}
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
      : entityName(primaryUnit.type);
    const activityLabel = activityName(primaryUnit.activity);
    const unitState = sc2StateName(primaryUnit.type, locale);

    return (
      <aside className="selection-inspector" style={{ "--selection-color": inspectedPlayer?.color ?? "#7b8794" } as React.CSSProperties}>
        <header>
          <span className="selection-icon"><SelectionIcon size={15} /></span>
          <div><small>{t("watcher.inspector")}</small><strong>{title}</strong><em>{inspectedPlayer?.name ?? t("watcher.unknownPlayer")} · {isGroup ? `${inspectedUnits.length} ${t("watcher.units")}` : sc2CategoryName(primaryUnit.category, locale)}{!isGroup && unitState ? ` · ${unitState}` : ""}</em></div>
          <button onClick={() => setSelection(null)} aria-label={t("watcher.closeInspector")}><X size={14} /></button>
        </header>

        {isGroup ? (
          <>
            <section className="inspector-economy">
              <div><small className="inspector-label-help">{t("watcher.economicValue")}<InfoTip label={t("watcher.economicValue")} side="right">{t("watcher.help.economicValue")}</InfoTip></small><strong>{compactNumber(inspectedMinerals + inspectedVespene)}</strong></div>
              <span><b>{compactNumber(inspectedMinerals)}</b> <Pickaxe size={10} /></span>
              <span><b>{compactNumber(inspectedVespene)}</b> <Zap size={10} /></span>
              <span><b>{number(inspectedSupply)}</b> {t("watcher.supply")}</span>
            </section>
            <section className="inspector-section composition-section">
              <h3><ListTree size={11} />{t("watcher.composition")}</h3>
              {composition.map((item) => {
                const member = inspectedUnits.find((unit) => unit.type === item.type) ?? primaryUnit;
                const MemberIcon = unitVisual(member).icon;
                return <div className="composition-row" key={item.type}><span><MemberIcon size={10} /><b>{entityName(item.type)}</b></span><strong>×{item.count}</strong><small>{compactNumber(item.minerals)} <Pickaxe size={8} /> · {compactNumber(item.vespene)} <Zap size={8} /></small></div>;
              })}
            </section>
          </>
        ) : (
          <>
            <section className="inspector-economy single-economy">
              <div><small className="inspector-label-help">{t("watcher.economicValue")}<InfoTip label={t("watcher.economicValue")} side="right">{t("watcher.help.economicValue")}</InfoTip></small><strong>{compactNumber(inspectedMinerals + inspectedVespene)}</strong></div>
              <span><b>{compactNumber(inspectedMinerals)}</b> <Pickaxe size={10} /></span>
              <span><b>{compactNumber(inspectedVespene)}</b> <Zap size={10} /></span>
              <span><b>{number(inspectedSupply)}</b> {t("watcher.supply")}</span>
            </section>
            {selectedAddon && <section className="inspector-addon"><span><Wrench size={11} />{t("watcher.addon")}</span><strong>{entityName(selectedAddon.type)}</strong><small>{selectedAddon.completed ? t("watcher.completed") : t("watcher.underConstruction")}</small></section>}
            {primaryUnit.isBuilding && (
              <section className="inspector-section inspector-production">
                <h3><Factory size={11} />{t("watcher.producingNow")}<em>{primaryUnit.completed ? t("watcher.completed") : t("watcher.underConstruction")}</em></h3>
                {selectedProduction.length === 0 ? <p>{t("watcher.noProductionHere")}</p> : selectedProduction.map((order) => {
                  const progress = productionProgress(order);
                  const state = order.queued ? t("watcher.queued") : t("watcher.secondsRemaining").replace("{seconds}", number(productionRemaining(order)));
                  return <div className="inspector-order" key={order.id}><span><b>{entityName(order.product)}</b><small>{state}</small></span><i><em style={{ width: `${progress * 100}%` }} /></i></div>;
                })}
              </section>
            )}
            <section className="inspector-section position-section">
              <h3><Target size={11} />{t("watcher.position")}</h3>
              <div><span>X <b>{primaryUnit.x.toFixed(1)}</b></span><span>Y <b>{primaryUnit.y.toFixed(1)}</b></span><span>{activityLabel}</span></div>
            </section>
          </>
        )}
      </aside>
    );
  };

  const renderCompactPlayerDrawer = () => {
    const player = replay.players.find((candidate) => candidate.id === compactPlayerId);
    if (!player) return null;
    const stats = currentFrame?.stats[String(player.id)];
    const index = replay.players.findIndex((candidate) => candidate.id === player.id);
    const RaceIcon = raceIcon(player.race);
    return (
      <aside className={`compact-player-drawer compact-player-drawer-${index === 0 ? "left" : "right"}`} style={{ "--player-color": player.color } as React.CSSProperties}>
        <header><span><i /><RaceIcon size={12} /></span><div><strong>{player.name}</strong><small>{player.race}</small></div><button onClick={() => setCompactPlayerId(null)} aria-label={t("watcher.closePlayerSummary")}><X size={13} /></button></header>
        <div className="compact-player-metrics">
          <span><Package size={11} /><small>{t("watcher.supply")}</small><b>{number(stats?.supplyUsed ?? 0)}/{number(stats?.supplyCap ?? 0)}</b></span>
          <span><Pickaxe size={11} /><small>{t("watcher.workers")}</small><b>{stats?.workers ?? 0}</b></span>
          <span><Swords size={11} /><small>{t("watcher.army")}</small><b>{number(stats?.armySupply ?? 0)} {t("watcher.supplyUnit")}</b></span>
          <span><Zap size={11} /><small>{t("watcher.income")}</small><b>{compactNumber((stats?.mineralRate ?? 0) + (stats?.vespeneRate ?? 0))}{t("watcher.perMinute")}</b></span>
        </div>
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
            <div className="match-meta" title={replay.meta.filename}><small>{t("watcher.patch")} {replay.meta.gameVersion}{replay.meta.playedAt ? ` · ${new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : "en-US", { dateStyle: "medium" }).format(new Date(replay.meta.playedAt))}` : ""}</small><strong><Clock3 size={15} /> {formatTime(replay.meta.duration)}</strong></div>
            <div className="compact-scoreboard" aria-label={t("watcher.compactScoreboard")}>
              {replay.players.slice(0, 2).map((player, index) => {
                const stats = currentFrame?.stats[String(player.id)];
                const RaceIcon = raceIcon(player.race);
                return (
                  <section key={player.id} style={{ "--player-color": player.color } as React.CSSProperties}>
                    <header><span>P{index + 1}</span><strong>{player.name}</strong><small><RaceIcon size={8} />{player.race}</small><InfoTip label={t("watcher.compactScoreboard")} side={index === 0 ? "left" : "right"}>{t("watcher.help.compactScoreboard")}</InfoTip><button className="compact-player-expand" aria-expanded={compactPlayerId === player.id} aria-label={t("watcher.openPlayerSummary", { player: player.name })} onClick={() => setCompactPlayerId((current) => current === player.id ? null : player.id)}><ChevronDown size={11} /></button></header>
                    <div>
                      <span title={t("watcher.supply")}><Package size={10} />{number(stats?.supplyUsed ?? 0)}/{number(stats?.supplyCap ?? 0)}</span>
                      <span title={t("watcher.workers")}><Pickaxe size={10} />{stats?.workers ?? 0}</span>
                      <span title={t("watcher.armyValue")}><Swords size={10} />{compactNumber(stats?.armyValue ?? 0)}</span>
                      <span title={t("watcher.bank")}><Database size={10} />{compactNumber((stats?.minerals ?? 0) + (stats?.vespene ?? 0))}</span>
                    </div>
                  </section>
                );
              })}
            </div>
            {renderCompactPlayerDrawer()}
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
                  return <i key={`camera-trail-${camera.playerId}-${camera.trackIndex}`} className="camera-trail-dot" style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, background: color, opacity: camera.opacity * .42, "--camera-color": color } as React.CSSProperties} />;
                })}
                {layers.cameras && renderedCameras.filter((camera) => cameraPlayers[camera.playerId] !== false).map((camera) => {
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
                  return <button key={cluster.id} className={`army-cluster ${isSelected ? "selected" : ""}`} style={{ left: `${point.left}%`, bottom: `${point.bottom}%`, borderColor: color, color, "--cluster-color": color } as React.CSSProperties} onClick={() => setSelection(isSelected ? null : { kind: "group", groupType: "army", unitIds: cluster.units.map((unit) => unit.id) })} title={`${cluster.units.length} ${t("watcher.armyUnits")} · ${entityName(dominantUnit.type)}`}><ClusterIcon size={11} /><b>{cluster.units.length}</b></button>;
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
                      title={`${entityName(unit.type)}${sc2StateName(unit.type, locale) ? ` · ${sc2StateName(unit.type, locale)}` : ""}${addon ? ` + ${entityName(addon.type)}` : ""} • ${player?.name ?? t("watcher.unknownPlayer")} • ${activityName(unit.activity)}`}
                      aria-label={`${entityName(unit.type)}${sc2StateName(unit.type, locale) ? ` · ${sc2StateName(unit.type, locale)}` : ""} · ${player?.name ?? t("watcher.unknownPlayer")}`}
                      onClick={() => setSelection((current) => current?.kind === "unit" && current.unitId === unit.id ? null : { kind: "unit", unitId: unit.id })}
                    >
                      {unit.category !== "resource" && <UnitIcon aria-hidden="true" />}
                      {addon && <b className={`addon-badge ${addon.type.toLowerCase().includes("reactor") ? "reactor" : "tech-lab"}`} title={entityName(addon.type)}>{addon.type.toLowerCase().includes("reactor") ? "R" : "T"}</b>}
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
                <em>P1 Δ</em>
                <InfoTip label={t("watcher.playerOneDelta")}>{t("watcher.help.playerOneDelta")}</InfoTip>
                <span className={playerOneDeltas.armySupply > 0 ? "positive" : playerOneDeltas.armySupply < 0 ? "negative" : ""} title={t("watcher.armySupplyDelta")}><Swords size={12} />{signedCompactNumber(playerOneDeltas.armySupply)}</span>
                <span className={playerOneDeltas.workers > 0 ? "positive" : playerOneDeltas.workers < 0 ? "negative" : ""} title={t("watcher.workerDelta")}><Hammer size={12} />{signedCompactNumber(playerOneDeltas.workers)}</span>
                <span className={playerOneDeltas.income > 0 ? "positive" : playerOneDeltas.income < 0 ? "negative" : ""} title={t("watcher.incomeDelta")}><Zap size={12} />{signedCompactNumber(playerOneDeltas.income)}</span>
              </div>
              <div className="map-toolbar" role="toolbar" aria-label={t("watcher.mapLayers")}>
                {(["terrain", "army", "workers", "buildings", "resources", "cameras"] as LayerKey[]).map((layer) => (
                  <button key={layer} className={layers[layer] ? "active" : ""} aria-pressed={layers[layer]} onClick={() => toggleLayer(layer)} title={layerLabels[layer]}>
                    {layers[layer] ? <Eye size={12} /> : <EyeOff size={12} />}<span>{layerLabels[layer]}</span>
                  </button>
                ))}
                {layers.cameras && replay.players.slice(0, 2).map((player, index) => {
                  const active = cameraPlayers[player.id] !== false;
                  return <button key={`camera-player-${player.id}`} className={`camera-player-toggle ${active ? "active" : ""}`} aria-pressed={active} onClick={() => setCameraPlayers((current) => ({ ...current, [player.id]: !active }))} title={`${t("watcher.cameraPlayer")} · ${player.name}`} style={{ "--camera-player-color": player.color } as React.CSSProperties}><Scan size={11} /><span>P{index + 1}</span></button>;
                })}
                <InfoTip label={t("watcher.iconLegend")}><span className="icon-legend-list"><span><Crosshair size={10} />{t("watcher.icon.siege")}</span><span><Eye size={10} />{t("watcher.icon.detector")}</span><span><Bomb size={10} />{t("watcher.icon.explosive")}</span><span><Boxes size={10} />{t("watcher.icon.transport")}</span><span><Sparkles size={10} />{t("watcher.icon.caster")}</span><em>{t("watcher.iconLegendAction")}</em></span></InfoTip>
                <i />
                <button onClick={() => setZoom((value) => Math.max(0.7, value - 0.25))} aria-label={t("watcher.zoomOut")}><Minus size={13} /></button>
                <b>{Math.round(zoom * 100)}%</b>
                <button onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label={t("watcher.zoomIn")}><Plus size={13} /></button>
                <button onClick={resetMap} aria-label={t("watcher.resetMap")}><Target size={13} /></button>
              </div>
              <div className="map-analysis-toolbar" role="toolbar" aria-label={t("watcher.analysisViews")}>
                <button className={comparisonView === "composition" ? "active" : ""} aria-pressed={comparisonView === "composition"} onClick={() => openComparison("composition")}><Swords size={12} /><span>{t("watcher.composition")}</span></button>
                <button className={comparisonView === "upgrades" ? "active" : ""} aria-pressed={comparisonView === "upgrades"} onClick={() => openComparison("upgrades")}><FlaskConical size={12} /><span>{t("watcher.upgrades")}</span></button>
              </div>
              {renderComparisonOverlay()}
              {nextEvent && <div className={`next-event next-event-${nextEvent.type}`} style={{ "--event-color": nextEventPlayer?.color ?? "#6eb5d2" } as React.CSSProperties}><small><i />{t("watcher.nextEvent")} · {t("watcher.inTime")} {formatTime(nextEvent.time - currentTime)}{nextEventPlayer ? ` · ${nextEventPlayer.name}` : ""}</small><strong><NextEventIcon size={11} /><span>{nextEventDisplay}</span></strong></div>}
              <div className="coordinates">X {Math.round(bounds.minX)}–{Math.round(bounds.maxX)} · Y {Math.round(bounds.minY)}–{Math.round(bounds.maxY)}</div>
            </div>
            {replay.players[1] && renderPlayerPanel(replay.players[1], "right")}
          </div>

          <div className="controls">
            <button className="icon-button" onClick={() => { setCurrentTime(0); setPlaying(false); }} aria-label={t("watcher.restart")}><RotateCcw size={17} /></button>
            <button className="play-button" onClick={() => setPlaying((value) => !value)} aria-keyshortcuts="Space" aria-label={playing ? t("watcher.pause") : t("watcher.play")}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
            <div className="event-nav">
              <button onClick={() => seekRelevantEvent(-1)} aria-label={t("watcher.previousEvent")} title={`${t("watcher.previousEvent")} · [`}><SkipBack size={13} /></button>
              <button onClick={() => seekRelevantEvent(1)} aria-label={t("watcher.nextRelevantEvent")} title={`${t("watcher.nextRelevantEvent")} · ]`}><SkipForward size={13} /></button>
            </div>
            <span className="control-time">{formatTime(currentTime)}</span>
            <div className="timeline-shell">
              {timelineHint && <div className="timeline-event-tooltip" role="status" style={{ left: `clamp(72px, ${timelineHint.position}%, calc(100% - 72px))` }}><CircleDot size={9} />{timelineHint.label}</div>}
              {armyAdvantageChart && <svg className="advantage-chart" viewBox="0 0 100 20" preserveAspectRatio="none" role="img" aria-label={t("watcher.armyAdvantageHistory")}><line x1="0" y1="10" x2="100" y2="10" /><polyline className="p1" points={armyAdvantageChart.positive} /><polyline className="p2" points={armyAdvantageChart.negative} /></svg>}
              <input className="timeline" aria-label="Tempo do replay" aria-keyshortcuts="ArrowLeft ArrowRight Home End" type="range" min="0" max={replay.meta.duration} step="0.1" value={currentTime} onChange={(event) => setCurrentTime(Number(event.target.value))} style={{ "--progress": `${(currentTime / replay.meta.duration) * 100}%` } as React.CSSProperties} />
              <div className="timeline-events" aria-label={t("watcher.analyticTimeline")}>
                {replay.timeline.filter((event) => event.time > 0).map((event, index) => {
                  const intervalEnd = event.end != null ? Math.min(replay.meta.duration, Math.max(event.time, event.end)) : null;
                  const intervalWidth = intervalEnd != null ? ((intervalEnd - event.time) / replay.meta.duration) * 100 : null;
                  const eventType = t(`watcher.timelineEvent.${event.type}`);
                  const label = `${eventType} · ${entityName(event.label)} · ${formatTime(event.time)}${intervalEnd != null ? `–${formatTime(intervalEnd)}` : ""}`;
                  const position = (event.time / replay.meta.duration) * 100;
                  return <button key={`${event.type}-${event.time}-${index}`} aria-label={label} className={`timeline-event ${event.type} ${intervalWidth != null ? "interval" : ""}`} style={{ left: `${position}%`, width: intervalWidth != null ? `max(2px, ${intervalWidth}%)` : undefined }} onMouseEnter={() => setTimelineHint({ label, position })} onMouseLeave={() => setTimelineHint(null)} onFocus={() => setTimelineHint({ label, position })} onBlur={() => setTimelineHint(null)} onClick={() => { setCurrentTime(event.time); setPlaying(false); if (event.engagementId) setSelection({ kind: "engagement", engagementId: event.engagementId }); }} title={label} />;
                })}
              </div>
            </div>
            <span className="control-time muted">{formatTime(replay.meta.duration)}</span>
            <label className="speed"><FastForward size={15} /><select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label={t("watcher.speed")}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select><ChevronDown size={14} /></label>
            <InfoTip label={t("watcher.timelineLegend")} side="right">{t("watcher.help.timelineLegend")}</InfoTip>
          </div>
        </section>
      </main>
    </div>
  );
}
