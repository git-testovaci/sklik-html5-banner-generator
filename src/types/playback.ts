export type PlaybackMode = "idle" | "playing-all" | "playing-scene" | "paused";

export interface PlaybackControllerSnapshot {
  mode: PlaybackMode;
  playbackTimeMs: number;
  playbackSceneId: string | null;
  replayKey: number;
  /** Multi-scene stacked preview (play all or paused mid play-all) */
  playAllView: boolean;
  isPlaying: boolean;
  isPaused: boolean;
}
