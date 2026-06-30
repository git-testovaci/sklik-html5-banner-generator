"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BannerScene } from "@/types/animation";
import type { PlaybackControllerSnapshot, PlaybackMode } from "@/types/playback";
import { isPlaybackModePlaying } from "@/types/playback";
import { playbackSceneIdAtGlobalMs, totalBannerDurationMs } from "@/lib/animation/global-timeline-utils";
import type { BannerEditorState } from "@/types/editor";
import {
  anchorPlaybackClock,
  clampPlaybackTimeMs,
  computeLiveTimeMs,
} from "@/lib/playback/playback-clock";

export interface UsePlaybackControllerOptions {
  loop: boolean;
  /** Global banner duration in ms (preferred). */
  totalDurationMs?: number;
  resolveSceneIdAtGlobalMs?: (globalMs: number) => string | null;
  /** Legacy public-preview options — mapped to global timeline when totalDurationMs is omitted. */
  scenes?: BannerScene[];
  timelineDurationMs?: number;
  activeSceneId?: string;
  state?: BannerEditorState;
}

export interface PlaybackController extends PlaybackControllerSnapshot {
  play: (startGlobalMs?: number) => void;
  playAll: (startGlobalMs?: number) => void;
  replayScene: (startGlobalMs?: number) => void;
  pause: (frozenGlobalMs?: number) => void;
  resume: (startGlobalMs?: number) => void;
  stop: () => void;
  previewSceneTransition: (startGlobalMs: number, sceneId: string | null) => void;
  getCurrentTimeMs: () => number;
  getLiveTimeMs: () => number;
}

function resolveTotalDurationMs(options: UsePlaybackControllerOptions): number {
  if (options.totalDurationMs != null) return Math.max(0, options.totalDurationMs);
  if (options.state) {
    const scenes = options.state.scenes ?? [];
    if (scenes.length > 0) return totalBannerDurationMs(options.state);
    return Math.max(
      0,
      options.state.timeline?.durationMs ?? options.timelineDurationMs ?? 3000,
    );
  }
  const scenes = options.scenes ?? [];
  if (scenes.length > 0) {
    return totalBannerDurationMs({ scenes } as BannerEditorState);
  }
  return Math.max(0, options.timelineDurationMs ?? 3000);
}

function resolveSceneResolver(
  options: UsePlaybackControllerOptions,
): (globalMs: number) => string | null {
  if (options.resolveSceneIdAtGlobalMs) return options.resolveSceneIdAtGlobalMs;
  if (options.state) {
    return (globalMs: number) => playbackSceneIdAtGlobalMs(options.state!, globalMs);
  }
  const scenes = options.scenes ?? [];
  if (scenes.length > 0) {
    const stub = { scenes } as BannerEditorState;
    return (globalMs: number) => playbackSceneIdAtGlobalMs(stub, globalMs);
  }
  return () => options.activeSceneId ?? null;
}

function outwardPlaybackMode(
  mode: "idle" | "playing" | "paused",
  multiScene: boolean,
): PlaybackMode {
  if (mode === "playing") return multiScene ? "playing-all" : "playing-scene";
  return mode;
}

export function usePlaybackController(
  options: UsePlaybackControllerOptions,
): PlaybackController {
  const [mode, setMode] = useState<"idle" | "playing" | "paused">("idle");
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [playbackSceneId, setPlaybackSceneId] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  const rafRef = useRef<number | null>(null);
  const clockOffsetMsRef = useRef(0);
  const clockStartedAtPerfRef = useRef(0);
  const clockMaxMsRef = useRef(0);
  const mountedRef = useRef(true);
  const configuredTotalDurationMs = resolveTotalDurationMs(options);
  const multiScene =
    (options.scenes ?? options.state?.scenes ?? []).length > 1;

  const resolveSceneRef = useRef(resolveSceneResolver(options));
  const totalDurationRef = useRef(configuredTotalDurationMs);
  const loopRef = useRef(options.loop);

  useEffect(() => {
    resolveSceneRef.current = resolveSceneResolver(options);
    totalDurationRef.current = configuredTotalDurationMs;
    loopRef.current = options.loop;
  }, [options, configuredTotalDurationMs]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const getLiveTimeMs = useCallback(() => {
    return computeLiveTimeMs(
      clockOffsetMsRef.current,
      clockStartedAtPerfRef.current,
      clockMaxMsRef.current,
    );
  }, []);

  const anchorClock = useCallback((offsetMs: number, maxMs: number) => {
    const anchored = anchorPlaybackClock(offsetMs, maxMs);
    clockOffsetMsRef.current = anchored.offsetMs;
    clockStartedAtPerfRef.current = anchored.startedAtPerf;
    clockMaxMsRef.current = anchored.maxMs;
  }, []);

  /** Update React-visible playhead only — clock refs are owned by anchorClock. */
  const syncVisibleTime = useCallback((ms: number) => {
    setPlaybackTimeMs(ms);
    setPlaybackSceneId(resolveSceneRef.current(ms));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRaf();
    };
  }, [cancelRaf]);

  useEffect(() => {
    if (mode !== "playing") {
      cancelRaf();
      return;
    }

    const duration = totalDurationRef.current;
    const loop = loopRef.current;

    cancelRaf();
    let cancelled = false;

    const liveMs = getLiveTimeMs();
    anchorClock(liveMs, duration);

    function tick() {
      if (cancelled || !mountedRef.current) return;
      let elapsed = getLiveTimeMs();

      if (loop && duration > 0 && elapsed >= duration) {
        anchorClock(0, duration);
        setReplayKey((k) => k + 1);
        elapsed = 0;
      }

      if (elapsed >= duration) {
        syncVisibleTime(duration);
        cancelRaf();
        setMode("idle");
        syncVisibleTime(0);
        anchorClock(0, duration);
        setPlaybackSceneId(null);
        return;
      }

      syncVisibleTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelRaf();
    };
  }, [mode, replayKey, cancelRaf, anchorClock, getLiveTimeMs, syncVisibleTime]);

  const play = useCallback(
    (startGlobalMs = 0) => {
      const duration = totalDurationRef.current;
      const clamped = clampPlaybackTimeMs(startGlobalMs, duration);
      anchorClock(clamped, duration);
      syncVisibleTime(clamped);
      setReplayKey((k) => k + 1);
      setMode("playing");
    },
    [anchorClock, syncVisibleTime],
  );

  const pause = useCallback(
    (frozenGlobalMs?: number) => {
      if (mode !== "playing") return;
      const duration = totalDurationRef.current;
      const frozen = clampPlaybackTimeMs(
        frozenGlobalMs ?? getLiveTimeMs(),
        duration,
      );
      cancelRaf();
      anchorClock(frozen, duration);
      syncVisibleTime(frozen);
      setMode("paused");
    },
    [mode, cancelRaf, anchorClock, getLiveTimeMs, syncVisibleTime],
  );

  const resume = useCallback(
    (startGlobalMs?: number) => {
      if (mode !== "paused") return;
      const duration = totalDurationRef.current;
      const resumeMs = clampPlaybackTimeMs(
        startGlobalMs ?? clockOffsetMsRef.current,
        duration,
      );
      anchorClock(resumeMs, duration);
      syncVisibleTime(resumeMs);
      setMode("playing");
    },
    [mode, anchorClock, syncVisibleTime],
  );

  const stop = useCallback(() => {
    cancelRaf();
    anchorClock(0, totalDurationRef.current);
    syncVisibleTime(0);
    setMode("idle");
    setPlaybackSceneId(null);
  }, [anchorClock, cancelRaf, syncVisibleTime]);

  const previewSceneTransition = useCallback(
    (startGlobalMs: number, sceneId: string | null) => {
      const duration = totalDurationRef.current;
      const clamped = clampPlaybackTimeMs(startGlobalMs, duration);
      cancelRaf();
      anchorClock(clamped, duration);
      syncVisibleTime(clamped);
      if (sceneId) setPlaybackSceneId(sceneId);
      setReplayKey((k) => k + 1);
      setMode("playing");
    },
    [anchorClock, cancelRaf, syncVisibleTime],
  );

  const outwardMode = outwardPlaybackMode(mode, multiScene);

  return {
    mode: outwardMode,
    playbackTimeMs,
    playbackSceneId,
    replayKey,
    isPlaying: isPlaybackModePlaying(outwardMode),
    isPaused: mode === "paused",
    playAllView: outwardMode === "playing-all",
    play,
    playAll: play,
    replayScene: play,
    pause,
    resume,
    stop,
    previewSceneTransition,
    getCurrentTimeMs: getLiveTimeMs,
    getLiveTimeMs,
  };
}
