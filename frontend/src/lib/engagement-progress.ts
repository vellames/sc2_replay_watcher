import type { ReplayDeath, ReplayEngagement } from "./types";

const ENGAGEMENT_RADIUS = 34;

export function engagementLossAt(
  engagement: ReplayEngagement,
  deaths: ReplayDeath[],
  currentTime: number,
) {
  if (currentTime < engagement.start) return 0;
  if (currentTime >= engagement.end) {
    return Object.values(engagement.losses).reduce((sum, value) => sum + value, 0);
  }

  const seen = new Set<string>();
  return deaths.reduce((total, death) => {
    if (death.time < engagement.start || death.time > currentTime) return total;
    const distanceSquared = (death.x - engagement.x) ** 2 + (death.y - engagement.y) ** 2;
    if (distanceSquared > ENGAGEMENT_RADIUS ** 2) return total;
    const identity = `${death.id}-${death.time}`;
    if (seen.has(identity)) return total;
    seen.add(identity);
    return total + (death.mineralCost ?? 0) + (death.vespeneCost ?? 0);
  }, 0);
}
