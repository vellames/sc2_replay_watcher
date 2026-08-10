export type WinProbabilityPoint = {
  time: number;
  playerOne: number;
  playerTwo: number;
};

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
