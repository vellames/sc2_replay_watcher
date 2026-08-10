export type WinProbabilityPoint = {
  time: number;
  playerOne: number;
  playerTwo: number;
};

export function nearestProbabilityPoint(
  points: WinProbabilityPoint[],
  time: number,
): WinProbabilityPoint | null {
  if (points.length === 0) return null;
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].time < time) low = middle + 1;
    else high = middle;
  }
  const next = points[low];
  const previous = points[Math.max(0, low - 1)];
  return Math.abs(previous.time - time) <= Math.abs(next.time - time) ? previous : next;
}

export function probabilityWindow(
  points: WinProbabilityPoint[],
  start: number,
  end: number,
): WinProbabilityPoint[] {
  if (points.length === 0 || end < start) return [];
  let startState: WinProbabilityPoint | null = null;
  let endState: WinProbabilityPoint | null = null;
  const inside: WinProbabilityPoint[] = [];
  for (const point of points) {
    if (point.time <= start) startState = point;
    if (point.time <= end) endState = point;
    if (point.time > start && point.time < end) inside.push(point);
    if (point.time > end) break;
  }
  if (!startState || !endState) return inside;
  return [
    { ...startState, time: start },
    ...inside,
    { ...endState, time: end },
  ];
}
