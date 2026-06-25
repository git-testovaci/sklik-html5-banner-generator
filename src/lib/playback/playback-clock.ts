/** Live playback position from anchored wall-clock timing. */
export function computeLiveTimeMs(
  offsetMs: number,
  startedAtPerf: number,
  maxMs: number,
): number {
  const live = offsetMs + (performance.now() - startedAtPerf);
  if (maxMs <= 0) return Math.max(0, live);
  return Math.max(0, Math.min(maxMs, live));
}

export function anchorPlaybackClock(
  offsetMs: number,
  maxMs: number,
): { offsetMs: number; startedAtPerf: number; maxMs: number } {
  return {
    offsetMs,
    startedAtPerf: performance.now(),
    maxMs,
  };
}
