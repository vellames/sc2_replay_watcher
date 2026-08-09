import { memo } from "react";

type ResourceModel = {
  bottom: number;
  color: string;
  id: number;
  label: string;
  left: number;
  selected: boolean;
  type: string;
};

type Props = { resources: ResourceModel[]; onSelect: (id: number) => void };

function ResourceLayer3D({ resources, onSelect }: Props) {
  return (
    <svg className="resource-layer-3d" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="World resources">
      {resources.map((resource) => {
        const x = resource.left;
        const y = 100 - resource.bottom;
        const geyser = /vespene|geyser/i.test(resource.type);
        const d = geyser
          ? `M${x - .62} ${y + .2}Q${x - .48} ${y - .72} ${x} ${y - .88}Q${x + .5} ${y - .7} ${x + .64} ${y + .2}L${x + .38} ${y + .58}H${x - .38}Z`
          : `M${x} ${y - .72}L${x + .42} ${y + .12}L${x + .2} ${y + .62}H${x - .22}L${x - .44} ${y + .12}ZM${x} ${y - .46}L${x + .16} ${y + .06}L${x} ${y + .38}L${x - .18} ${y + .06}Z`;
        return (
          <path
            key={resource.id}
            className={`${geyser ? "geyser" : "mineral"} ${resource.selected ? "selected" : ""}`}
            d={d}
            style={{ "--resource-color": resource.color } as React.CSSProperties}
            role="button"
            tabIndex={0}
            aria-label={resource.label}
            onClick={() => onSelect(resource.id)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(resource.id); }}
          ><title>{resource.label}</title></path>
        );
      })}
    </svg>
  );
}

export const Sc2ResourceLayer3D = memo(ResourceLayer3D, (previous, next) => previous.onSelect === next.onSelect
  && previous.resources.length === next.resources.length
  && previous.resources.every((resource, index) => {
    const candidate = next.resources[index];
    return resource.id === candidate.id
      && resource.left === candidate.left
      && resource.bottom === candidate.bottom
      && resource.selected === candidate.selected
      && resource.type === candidate.type
      && resource.color === candidate.color
      && resource.label === candidate.label;
  }));
