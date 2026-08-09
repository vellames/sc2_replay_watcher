import { memo } from "react";

import { Sc2Model3D } from "@/components/sc2-model-3d";
import type { ReplayUnit } from "@/lib/types";

export type ModelTooltip = { color: string; left: number; text: string; top: number };

type Props = {
  addon?: ReplayUnit;
  addonName?: string;
  ariaLabel: string;
  bottom: number;
  color: string;
  detailed: boolean;
  heading: number;
  left: number;
  onSelect: (id: number) => void;
  onTooltip: (tooltip: ModelTooltip | null) => void;
  offsetX: number;
  offsetY: number;
  overview: boolean;
  productionCount: number;
  productionRatio: number;
  race?: string;
  selected: boolean;
  title: string;
  unit: ReplayUnit;
  visualKind: string;
};

export const Sc2UnitMarker3D = memo(function Sc2UnitMarker3D({ addon, addonName, ariaLabel, bottom, color, detailed, heading, left, onSelect, onTooltip, offsetX, offsetY, overview, productionCount, productionRatio, race, selected, title, unit, visualKind }: Props) {
  const addonIsReactor = addon?.type.toLowerCase().includes("reactor") ?? false;
  const semanticDepth = selected ? 1000 : visualKind === "air" ? 180 : unit.isArmy ? 100 : unit.category === "worker" ? 35 : 0;
  const showTooltip = (element: HTMLButtonElement) => {
    const rect = element.getBoundingClientRect();
    onTooltip({ color, text: title, left: Math.max(8, Math.min(window.innerWidth - 230, rect.left + rect.width / 2)), top: Math.max(8, rect.top - 10) });
  };
  return (
    <button
      className={`unit unit-3d ${unit.category} role-${visualKind} ${unit.activity} ${unit.isTownHall ? "town-hall" : ""} ${productionCount > 0 ? "producing" : ""} ${unit.positionSource === "estimated" ? "estimated" : ""} ${selected ? "selected" : ""}`}
      style={{ left: `${left}%`, bottom: `${bottom}%`, translate: `${offsetX}px ${offsetY}px`, zIndex: 1000 - Math.round(bottom * 5) + semanticDepth, "--unit-color": color, "--heading": `${heading}deg`, "--production-angle": `${productionRatio * 360}deg` } as React.CSSProperties}
      aria-label={ariaLabel}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={() => onTooltip(null)}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={() => onTooltip(null)}
      onClick={() => { onTooltip(null); onSelect(unit.id); }}
    >
      <Sc2Model3D type={unit.type} race={race} completed={unit.completed} moving={unit.isMoving} detailed={detailed} overview={overview} />
      {addon && <b className={`tactical-addon-3d ${addonIsReactor ? "reactor" : "tech-lab"}`} title={addonName}>{addonIsReactor ? "R" : "T"}</b>}
      {productionCount > 0 && <b className="production-badge">{productionCount}</b>}
    </button>
  );
});
