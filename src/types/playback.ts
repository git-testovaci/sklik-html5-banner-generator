export type PlaybackMode =
  | "idle"
  | "playing"
  | "paused"
  /** Legacy public-preview / timeline labels (emitted while playing). */
  | "playing-all"
  | "playing-scene";

export interface PlaybackControllerSnapshot {
  mode: PlaybackMode;
  /** Global banner timeline position in milliseconds. */
  playbackTimeMs: number;
  playbackSceneId: string | null;
  replayKey: number;
  isPlaying: boolean;
  isPaused: boolean;
  /** True while playing a multi-scene banner (public preview stacked render). */
  playAllView: boolean;
}
