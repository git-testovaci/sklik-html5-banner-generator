"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BannerScene } from "@/types/animation";
import type { PlaybackControllerSnapshot, PlaybackMode } from "@/types/playback";
import { getSceneTransitionDurationMs } from "@/lib/animation/storyboard-utils";
import {
  clampGlobalPlaybackTime,
  playbackSceneIdAtGlobalTime,
} from "@/lib/animation/editor-playback-time";
import { anchorPlaybackClock, computeLiveTimeMs } from "@/lib/playback/playback-clock";

export interface UsePlaybackControllerOptions {
  scenes: BannerScene[] | undefined;
  loop: boolean;
  timelineDurationMs: number;
  activeSceneId: string | undefined;
}

export interface PlaybackController extends PlaybackControllerSnapshot {
  playAll: (startMs?: number) => void;
  replayScene: (startMs?: number) => void;
  pause: (frozenAtMs?: number) => void;
  resume: (startMs?: number) => void;
  stop: () => void;
  previewSceneTransition: () => void;
  getCurrentTimeMs: () => number;
  getLiveTimeMs: () => number;
}

export function usePlaybackController(
  options: UsePlaybackControllerOptions,
): PlaybackController {
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [playbackSceneId, setPlaybackSceneId] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [pausedFrom, setPausedFrom] = useState<"playing-all" | "playing-scene">("playing-all");

  const rafRef = useRef<number | null>(null);
  const clockOffsetMsRef = useRef(0);
  const clockStartedAtPerfRef = useRef(0);
  const clockMaxMsRef = useRef(0);
  const mountedRef = useRef(true);

  const scenesList = useMemo(() => options.scenes ?? [], [options.scenes]);

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

  const syncVisibleTime = useCallback(
    (ms: number) => {
      clockOffsetMsRef.current = ms;
      setPlaybackTimeMs(ms);
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRaf();
    };
  }, [cancelRaf]);

  useEffect(() => {
    if (mode !== "playing-all" && mode !== "playing-scene") {
      cancelRaf();
      return;
    }

    const isAll = mode === "playing-all";
    const scene =
      scenesList.find((s) => s.id === (options.activeSceneId ?? scenesList[0]?.id)) ??
      scenesList[0];
    const totalDurationMs = scenesList.reduce((sum, s) => sum + s.durationMs, 0);
    const duration = isAll
      ? totalDurationMs
      : scene?.durationMs ?? options.timelineDurationMs;
    const loop = options.loop;

    cancelRaf();
    let cancelled = false;

    // Re-anchor wall clock at the current live position (handles effect restarts).
    const liveMs = getLiveTimeMs();
    anchorClock(liveMs, duration);

    function resolveSceneAt(elapsed: number) {
      if (!isAll || scenesList.length <= 1) {
        setPlaybackSceneId(scene?.id ?? null);
        return;
      }
      let offset = 0;
      for (const s of scenesList) {
        if (elapsed >= offset && elapsed < offset + s.durationMs) {
          setPlaybackSceneId(s.id);
          return;
        }
        offset += s.durationMs;
      }
      setPlaybackSceneId(scenesList[scenesList.length - 1]?.id ?? null);
    }

    function tick() {
      if (cancelled || !mountedRef.current) return;
      let elapsed = getLiveTimeMs();

      if (isAll && loop && duration > 0 && elapsed >= duration) {
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
        if (isAll) setPlaybackSceneId(null);
        return;
      }

      syncVisibleTime(elapsed);
      resolveSceneAt(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelRaf();
    };
  }, [
    mode,
    replayKey,
    cancelRaf,
    anchorClock,
    getLiveTimeMs,
    syncVisibleTime,
    options.loop,
    options.timelineDurationMs,
    options.activeSceneId,
    scenesList,
  ]);

  const playAll = useCallback(
    (startMs = 0) => {
      const totalDurationMs = scenesList.reduce((sum, s) => sum + s.durationMs, 0);
      const clamped = clampGlobalPlaybackTime(scenesList, startMs);
      anchorClock(clamped, totalDurationMs);
      syncVisibleTime(clamped);
      setPlaybackSceneId(playbackSceneIdAtGlobalTime(scenesList, clamped));
      setReplayKey((k) => k + 1);
      setMode("playing-all");
    },
    [anchorClock, scenesList, syncVisibleTime],
  );

  const replayScene = useCallback(
    (startMs = 0) => {
      const sceneId = options.activeSceneId ?? scenesList[0]?.id ?? null;
      const scene = scenesList.find((s) => s.id === sceneId);
      const duration = scene?.durationMs ?? options.timelineDurationMs;
      const clamped = Math.max(0, Math.min(duration, startMs));
      anchorClock(clamped, duration);
      syncVisibleTime(clamped);
      setPlaybackSceneId(sceneId);
      setReplayKey((k) => k + 1);
      setMode("playing-scene");
    },
    [anchorClock, options.activeSceneId, options.timelineDurationMs, scenesList, syncVisibleTime],
  );

  const pause = useCallback(
    (frozenAtMs?: number) => {
      if (mode !== "playing-all" && mode !== "playing-scene") return;
      const frozen = frozenAtMs ?? getLiveTimeMs();
      setPausedFrom(mode === "playing-all" ? "playing-all" : "playing-scene");
      cancelRaf();
      syncVisibleTime(frozen);
      setMode("paused");
    },
    [mode, cancelRaf, getLiveTimeMs, syncVisibleTime],
  );

  const resume = useCallback(
    (startMs?: number) => {
      if (mode !== "paused") return;
      const resumeMs = startMs ?? clockOffsetMsRef.current;
      const isAll = pausedFrom === "playing-all";
      const scene =
        scenesList.find((s) => s.id === (options.activeSceneId ?? scenesList[0]?.id)) ??
        scenesList[0];
      const totalDurationMs = scenesList.reduce((sum, s) => sum + s.durationMs, 0);
      const duration = isAll ? totalDurationMs : scene?.durationMs ?? options.timelineDurationMs;
      anchorClock(resumeMs, duration);
      syncVisibleTime(resumeMs);
      if (isAll) {
        setPlaybackSceneId(playbackSceneIdAtGlobalTime(scenesList, resumeMs));
      }
      setMode(pausedFrom);
    },
    [
      mode,
      pausedFrom,
      anchorClock,
      options.activeSceneId,
      options.timelineDurationMs,
      scenesList,
      syncVisibleTime,
    ],
  );

  const stop = useCallback(() => {
    cancelRaf();
    anchorClock(0, clockMaxMsRef.current);
    syncVisibleTime(0);
    setMode("idle");
    setPlaybackSceneId(null);
  }, [anchorClock, cancelRaf, syncVisibleTime]);

  const previewSceneTransition = useCallback(() => {
    const sceneId = options.activeSceneId ?? scenesList[0]?.id;
    const scene = scenesList.find((s) => s.id === sceneId);
    if (!scene) return;
    const transitionMs = getSceneTransitionDurationMs(scene);
    const startAt = Math.max(0, scene.durationMs - transitionMs - 200);
    cancelRaf();
    anchorClock(startAt, scene.durationMs);
    syncVisibleTime(startAt);
    setPlaybackSceneId(sceneId ?? null);
    setReplayKey((k) => k + 1);
    setMode("playing-scene");
  }, [anchorClock, cancelRaf, options.activeSceneId, scenesList, syncVisibleTime]);

  const playAllView =
    mode === "playing-all" || (mode === "paused" && pausedFrom === "playing-all");

  return {
    mode,
    playbackTimeMs,
    playbackSceneId,
    replayKey,
    playAllView,
    isPlaying: mode === "playing-all" || mode === "playing-scene",
    isPaused: mode === "paused",
    playAll,
    replayScene,
    pause,
    resume,
    stop,
    previewSceneTransition,
    getCurrentTimeMs: getLiveTimeMs,
    getLiveTimeMs,
  };
}
