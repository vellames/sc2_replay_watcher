import { memo } from "react";

import { Sc2Model3D } from "@/components/sc2-model-3d";
import type { ReplayUnit } from "@/lib/types";

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
  productionCount: number;
  productionRatio: number;
  race?: string;
  selected: boolean;
  title: string;
  unit: ReplayUnit;
  visualKind: string;
};

export const Sc2UnitMarker3D = memo(function Sc2UnitMarker3D({ addon, addonName, ariaLabel, bottom, color, detailed, heading, left, onSelect, productionCount, productionRatio, race, selected, title, unit, visualKind }: Props) {
  const addonIsReactor = addon?.type.toLowerCase().includes("reactor") ?? false;
  return (
    <button
      className={`unit unit-3d ${unit.category} role-${visualKind} ${unit.activity} ${unit.isTownHall ? "town-hall" : ""} ${productionCount > 0 ? "producing" : ""} ${unit.positionSource === "estimated" ? "estimated" : ""} ${selected ? "selected" : ""}`}
      style={{ left: `${left}%`, bottom: `${bottom}%`, zIndex: 1000 - Math.round(bottom * 5), "--unit-color": color, "--heading": `${heading}deg`, "--production-angle": `${productionRatio * 360}deg` } as React.CSSProperties}
      title={title}
      aria-label={ariaLabel}
      onClick={() => onSelect(unit.id)}
    >
      <Sc2Model3D type={unit.type} race={race} completed={unit.completed} moving={unit.isMoving} detailed={detailed} />
      {addon && <b className={`tactical-addon-3d ${addonIsReactor ? "reactor" : "tech-lab"}`} title={addonName}>{addonIsReactor ? "R" : "T"}</b>}
      {productionCount > 0 && <b className="production-badge">{productionCount}</b>}
    </button>
  );
});

