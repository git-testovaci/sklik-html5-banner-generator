export type PlaybackMode = "idle" | "paused" | "playing-all" | "playing-scene";

/** True when outward playback mode indicates active playback (not idle/paused). */
export function isPlaybackModePlaying(mode: PlaybackMode): boolean {
  return mode === "playing-all" || mode === "playing-scene";
}

export interface PlaybackControllerSnapshot {
  mode: PlaybackMode;
  /** Global banner timeline position in milliseconds (1 real second ≈ 1000 ms). */
  playbackTimeMs: number;
  playbackSceneId: string | null;
  replayKey: number;
  isPlaying: boolean;
  isPaused: boolean;
  /** True while playing a multi-scene banner (public preview stacked render). */
  playAllView: boolean;
}
