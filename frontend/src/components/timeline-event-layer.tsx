import { memo } from "react";

export type TimelineEventPresentation = {
  engagementId?: string;
  key: string;
  label: string;
  left: number;
  time: number;
  type: string;
  width?: number;
};

export const TimelineEventLayer = memo(function TimelineEventLayer({ events, onHint, onSeek }: { events: TimelineEventPresentation[]; onHint: (hint: { label: string; position: number } | null) => void; onSeek: (time: number, engagementId?: string) => void }) {
  return (
    <>
      {events.map((event) => (
        <button
          key={event.key}
          aria-label={event.label}
          className={`timeline-event ${event.type} ${event.width != null ? "interval" : ""}`}
          style={{ left: `${event.left}%`, width: event.width != null ? `max(2px, ${event.width}%)` : undefined }}
          onMouseEnter={() => onHint({ label: event.label, position: event.left })}
          onMouseLeave={() => onHint(null)}
          onFocus={() => onHint({ label: event.label, position: event.left })}
          onBlur={() => onHint(null)}
          onClick={() => onSeek(event.time, event.engagementId)}
          title={event.label}
        />
      ))}
    </>
  );
});

