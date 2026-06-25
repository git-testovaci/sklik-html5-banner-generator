"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BannerScene } from "@/types/animation";
import type { PlaybackControllerSnapshot, PlaybackMode } from "@/types/playback";
import { playbackSceneIdAtGlobalMs, totalBannerDurationMs } from "@/lib/animation/global-timeline-utils";
import type { BannerEditorState } from "@/types/editor";
import { anchorPlaybackClock, computeLiveTimeMs } from "@/lib/playback/playback-clock";

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
  if (options.state) return totalBannerDurationMs(options.state);
  const scenes = options.scenes ?? [];
  if (scenes.length > 0) {
    return scenes.reduce((sum, s) => sum + s.durationMs, 0);
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
  return (globalMs: number) => {
    if (scenes.length === 0) return options.activeSceneId ?? null;
    let offset = 0;
    for (const scene of scenes) {
      const end = offset + scene.durationMs;
      if (globalMs >= offset && globalMs < end) return scene.id;
      offset = end;
    }
    return scenes[scenes.length - 1]?.id ?? null;
  };
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

  const syncVisibleTime = useCallback((ms: number) => {
    clockOffsetMsRef.current = ms;
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
      const clamped = Math.max(0, Math.min(duration, startGlobalMs));
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
      const frozen = frozenGlobalMs ?? getLiveTimeMs();
      cancelRaf();
      syncVisibleTime(frozen);
      setMode("paused");
    },
    [mode, cancelRaf, getLiveTimeMs, syncVisibleTime],
  );

  const resume = useCallback(
    (startGlobalMs?: number) => {
      if (mode !== "paused") return;
      const duration = totalDurationRef.current;
      const resumeMs = startGlobalMs ?? clockOffsetMsRef.current;
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
      cancelRaf();
      anchorClock(startGlobalMs, totalDurationRef.current);
      syncVisibleTime(startGlobalMs);
      if (sceneId) setPlaybackSceneId(sceneId);
      setReplayKey((k) => k + 1);
      setMode("playing");
    },
    [anchorClock, cancelRaf, syncVisibleTime],
  );

  return {
    mode: outwardPlaybackMode(mode, multiScene),
    playbackTimeMs,
    playbackSceneId,
    replayKey,
    isPlaying: mode === "playing",
    isPaused: mode === "paused",
    playAllView: mode === "playing" && multiScene,
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
