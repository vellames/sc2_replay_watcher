import { memo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const markerRef = useRef<HTMLButtonElement>(null);
  const [tooltip, setTooltip] = useState<{ left: number; top: number } | null>(null);
  const showTooltip = () => {
    const rect = markerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ left: Math.max(8, Math.min(window.innerWidth - 230, rect.left + rect.width / 2)), top: Math.max(8, rect.top - 10) });
  };
  return (
    <>
      <button
        ref={markerRef}
        className={`unit unit-3d ${unit.category} role-${visualKind} ${unit.activity} ${unit.isTownHall ? "town-hall" : ""} ${productionCount > 0 ? "producing" : ""} ${unit.positionSource === "estimated" ? "estimated" : ""} ${selected ? "selected" : ""}`}
        style={{ left: `${left}%`, bottom: `${bottom}%`, zIndex: 1000 - Math.round(bottom * 5), "--unit-color": color, "--heading": `${heading}deg`, "--production-angle": `${productionRatio * 360}deg` } as React.CSSProperties}
        aria-label={ariaLabel}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltip(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltip(null)}
        onClick={() => onSelect(unit.id)}
      >
        <Sc2Model3D type={unit.type} race={race} completed={unit.completed} moving={unit.isMoving} detailed={detailed} />
        {addon && <b className={`tactical-addon-3d ${addonIsReactor ? "reactor" : "tech-lab"}`} title={addonName}>{addonIsReactor ? "R" : "T"}</b>}
        {productionCount > 0 && <b className="production-badge">{productionCount}</b>}
      </button>
      {tooltip && createPortal(<span className="world-model-tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top, "--unit-color": color } as React.CSSProperties}>{title}</span>, document.body)}
    </>
  );
});
