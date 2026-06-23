"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BannerScene } from "@/types/animation";
import type { PlaybackControllerSnapshot, PlaybackMode } from "@/types/playback";

export interface UsePlaybackControllerOptions {
  scenes: BannerScene[] | undefined;
  loop: boolean;
  timelineDurationMs: number;
  activeSceneId: string | undefined;
}

export interface PlaybackController extends PlaybackControllerSnapshot {
  playAll: () => void;
  replayScene: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
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
  const elapsedRef = useRef(0);
  const mountedRef = useRef(true);

  const scenesList = useMemo(() => options.scenes ?? [], [options.scenes]);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

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
    let startPerf = performance.now() - elapsedRef.current;
    let cancelled = false;

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

    function tick(now: number) {
      if (cancelled || !mountedRef.current) return;
      let elapsed = now - startPerf;

      if (isAll && loop && duration > 0 && elapsed >= duration) {
        elapsedRef.current = 0;
        setReplayKey((k) => k + 1);
        startPerf = performance.now();
        elapsed = 0;
      }

      if (elapsed >= duration) {
        elapsedRef.current = duration;
        setPlaybackTimeMs(duration);
        cancelRaf();
        setMode("idle");
        setPlaybackTimeMs(0);
        elapsedRef.current = 0;
        if (isAll) setPlaybackSceneId(null);
        return;
      }

      elapsedRef.current = elapsed;
      setPlaybackTimeMs(elapsed);
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
    options.loop,
    options.timelineDurationMs,
    options.activeSceneId,
    scenesList,
  ]);

  const playAll = useCallback(() => {
    elapsedRef.current = 0;
    setPlaybackTimeMs(0);
    setPlaybackSceneId(scenesList[0]?.id ?? null);
    setReplayKey((k) => k + 1);
    setMode("playing-all");
  }, [scenesList]);

  const replayScene = useCallback(() => {
    elapsedRef.current = 0;
    const sceneId = options.activeSceneId ?? scenesList[0]?.id ?? null;
    setPlaybackTimeMs(0);
    setPlaybackSceneId(sceneId);
    setReplayKey((k) => k + 1);
    setMode("playing-scene");
  }, [options.activeSceneId, scenesList]);

  const pause = useCallback(() => {
    if (mode !== "playing-all" && mode !== "playing-scene") return;
    setPausedFrom(mode === "playing-all" ? "playing-all" : "playing-scene");
    cancelRaf();
    setMode("paused");
  }, [mode, cancelRaf]);

  const resume = useCallback(() => {
    if (mode !== "paused") return;
    setMode(pausedFrom);
  }, [mode, pausedFrom]);

  const stop = useCallback(() => {
    cancelRaf();
    elapsedRef.current = 0;
    setMode("idle");
    setPlaybackTimeMs(0);
    setPlaybackSceneId(null);
  }, [cancelRaf]);

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
  };
}
