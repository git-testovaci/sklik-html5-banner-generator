/** Clamp a global playhead position to the banner duration (milliseconds). */
export function clampPlaybackTimeMs(ms: number, maxMs: number): number {
  if (!Number.isFinite(ms) || maxMs <= 0) return 0;
  return Math.max(0, Math.min(maxMs, ms));
}

/**
 * Live playback position from anchored wall-clock timing.
 * 1 real second advances ~1000 ms on the timeline — no duration scaling.
 * Update offset only via anchorPlaybackClock, never during RAF ticks.
 */
export function computeLiveTimeMs(
  offsetMs: number,
  startedAtPerf: number,
  maxMs: number,
): number {
  const live = offsetMs + (performance.now() - startedAtPerf);
  return clampPlaybackTimeMs(live, maxMs);
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
