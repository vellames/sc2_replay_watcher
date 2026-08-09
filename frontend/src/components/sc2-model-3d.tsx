import { memo } from "react";

import { sc2ModelAsset, type Sc2ModelShape } from "@/lib/sc2-3d-assets";

type ShapeGeometry = { hull: string; inset?: string; hardpoint?: string };

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
  "terran-command": { hull: "M6 7h20l4 7-2 12-8 5H10l-7-5-1-12z", inset: "M10 10h12l4 6-2 8-8 4-9-4-1-8z", hardpoint: "M13 13h6l3 5-3 5h-6l-3-5z" },
  "terran-production": { hull: "M4 9h21l5 6-3 13H7L2 23z", inset: "M8 12h13l5 5-3 8H9l-4-4z", hardpoint: "M9 7h4v7H9zm10-3h3v10h-3z" },
  "terran-tech": { hull: "M7 8h18l5 8-4 12H7L2 21z", inset: "M11 11h10l5 6-4 7H9l-3-5z", hardpoint: "M14 5h4v12h-4z" },
  "terran-defense": { hull: "M9 12l7-7 7 7 6 5-4 10H7L3 17z", inset: "M11 14l5-5 5 5 2 8H9z", hardpoint: "M14 12h5l1 5 9-3v3l-10 4-5-4z" },
  "terran-supply": { hull: "M5 11h22l3 7-4 9H6l-4-9z", inset: "M8 14h16l2 5-3 5H8l-2-5z", hardpoint: "M9 17h14v2H9z" },
  gas: { hull: "M10 8l6-4 7 4 5 9-3 10H8L4 17z", inset: "M13 10l4-2 4 3 2 8-4 5h-7l-3-5z" },
  "zerg-townhall": { hull: "M16 3l6 4 7 10-3 10-10 5-10-5-3-10L10 7z" },
  "zerg-organic": { hull: "M16 4l7 5 6 9-6 9-7 3-8-3-5-9 6-9z" },
  "zerg-spire": { hull: "M16 2l5 8 7 7-5 11-7 4-8-4-4-11 7-7z" },
  "zerg-defense": { hull: "M16 4l5 8 7 4-4 11-8 4-8-4-4-11 7-4z" },
  "protoss-nexus": { hull: "M16 2l6 7 7 8-4 10-9 5-9-5-4-10 7-8z" },
  "protoss-gateway": { hull: "M16 3l11 9 2 12-13 7L3 24l2-12z" },
  "protoss-tech": { hull: "M16 2l8 10 5 7-6 10H9L3 19l5-7z" },
  "protoss-defense": { hull: "M16 3l5 9 8 5-5 11-8 3-8-3-5-11 8-5z" },
  "protoss-pylon": { hull: "M16 1l7 12-3 16-4 3-4-3-3-16z" },
  "neutral-tower": { hull: "M13 3h6l3 12 6 7-5 8H9l-5-8 6-7z", inset: "M15 7h2l2 12-3 5-3-5z" },
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

export const Sc2Model3D = memo(function Sc2Model3D({ type, race, completed, moving, detailed, overview }: { type: string; race?: string; completed: boolean; moving: boolean; detailed: boolean; overview: boolean }) {
  const asset = sc2ModelAsset(type);
  const shape = geometry[asset.shape];
  const detailId = asset.detail ? `sc2-detail-${asset.detail}` : shape.hardpoint ? `sc2-hardpoint-${asset.shape}` : null;
  return (
    <svg className={`sc2-model-3d footprint-${asset.footprint} elevation-${asset.elevation ?? "ground"} race-${race?.toLowerCase() ?? "neutral"} ${asset.facing ? "faces-heading" : ""} ${completed ? "" : "constructing"} ${moving ? "moving" : ""} ${overview ? "lod-overview" : ""}`} viewBox="0 0 32 36" aria-hidden="true">
      <ellipse className="model-shadow" cx="16" cy="31" rx="12" ry="3" />
      {(asset.elevation === "air" || asset.elevation === "high-air") && <line className="model-altitude-line" x1="16" y1="25" x2="16" y2="35" />}
      <use href={`#sc2-shape-${asset.shape}`} />
      {detailed && shape.inset && <use href={`#sc2-inset-${asset.shape}`} />}
      {detailed && detailId && <use href={`#${detailId}`} />}
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
            <path d={shape.hull} transform="translate(0 3)" fill="#03080c" stroke="currentColor" strokeOpacity=".34" strokeWidth="1.25" strokeLinejoin="round" />
            <path d={shape.hull} fill="currentColor" fillOpacity=".78" stroke="#dff8ff" strokeOpacity=".72" strokeWidth=".85" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </symbol>
        ))}
        {Object.entries(geometry).filter(([, shape]) => shape.inset).map(([name, shape]) => (
          <symbol key={`inset-${name}`} id={`sc2-inset-${name}`} viewBox="0 0 32 36"><path d={shape.inset} fill="#061018" fillOpacity=".92" /></symbol>
        ))}
        {Object.entries(geometry).filter(([, shape]) => shape.hardpoint).map(([name, shape]) => (
          <symbol key={`hardpoint-${name}`} id={`sc2-hardpoint-${name}`} viewBox="0 0 32 36"><path d={shape.hardpoint} fill="#dff8ff" stroke="currentColor" strokeWidth=".45" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></symbol>
        ))}
        {Object.entries(details).map(([name, path]) => (
          <symbol key={`detail-${name}`} id={`sc2-detail-${name}`} viewBox="0 0 32 36"><path d={path} fill="#dff8ff" stroke="currentColor" strokeWidth=".45" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></symbol>
        ))}
      </defs>
    </svg>
  );
});
