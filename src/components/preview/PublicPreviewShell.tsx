"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatBannerSize } from "@/lib/banner-sizes";
import { projectToEditorState } from "@/lib/animation/timeline-utils";
import { totalStoryboardDurationMs } from "@/lib/animation/storyboard-utils";
import { collectAssetWarnings } from "@/lib/assets/asset-validation";
import {
  getProjectByShareIdSnapshot,
  subscribeProjects,
} from "@/lib/project-storage";
import type { BannerEditorState } from "@/types/editor";
import { BannerPreview } from "@/components/editor/BannerPreview";
import { PlaybackTimeline } from "@/components/editor/PlaybackTimeline";
import { PreviewPlaybackControls } from "@/components/editor/PreviewPlaybackControls";

interface PublicPreviewShellProps {
  shareId: string;
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function usePreviewProject(shareId: string) {
  return useSyncExternalStore(
    subscribeProjects,
    () => getProjectByShareIdSnapshot(shareId),
    () => undefined,
  );
}

interface PreviewContentProps {
  state: BannerEditorState;
}

function PreviewContent({ state }: PreviewContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [replayKey, setReplayKey] = useState(0);
  const [playAll, setPlayAll] = useState(false);
  const [loopPreview, setLoopPreview] = useState(state.timeline?.loop ?? false);
  const [playbackSceneId, setPlaybackSceneId] = useState<string | null>(null);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const playbackRafRef = useRef<number | null>(null);
  const sizeLabel = formatBannerSize(state.width, state.height);
  const hasAssets = (state.assets ?? []).length > 0;
  const hasStoryboard = (state.scenes ?? []).length > 1;
  const assetNoteKey = (state.assets ?? []).map((a) => a.id).join(",");
  const [assetNoteCache, setAssetNoteCache] = useState<Record<string, string>>({});

  useEffect(() => {
    function updateScale() {
      const container = containerRef.current;
      if (!container) return;
      const padding = 64;
      const sx = (container.clientWidth - padding) / state.width;
      const sy = (container.clientHeight - padding) / state.height;
      setScale(Math.min(sx, sy, 1) || 1);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [state.width, state.height]);

  useEffect(() => {
    if (!hasAssets) return;
    let cancelled = false;
    void collectAssetWarnings(state).then((warnings) => {
      if (cancelled) return;
      const missing = warnings.find((w) => w.id.startsWith("missing-"));
      const note = missing
        ? "Některé obrázky chybí v tomto prohlížeči. Veřejný náhled funguje nejlépe na stejném zařízení, kde jste je nahráli."
        : "Obrázky jsou uložené lokálně v prohlížeči. Na jiném zařízení se nemusí zobrazit.";
      setAssetNoteCache((prev) => ({ ...prev, [assetNoteKey]: note }));
    });
    return () => {
      cancelled = true;
    };
  }, [state, hasAssets, assetNoteKey]);

  useEffect(() => {
    return () => {
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const scenes = state.scenes ?? [];
    const timelineDurationMs = state.timeline?.durationMs ?? 3000;
    const scene =
      scenes.find((s) => s.id === (state.activeSceneId ?? scenes[0]?.id)) ?? scenes[0];
    const totalDurationMs = scenes.reduce((sum, s) => sum + s.durationMs, 0);
    const duration = playAll ? totalDurationMs : scene?.durationMs ?? timelineDurationMs;

    if (!playAll && replayKey === 0) {
      return;
    }

    if (playbackRafRef.current !== null) {
      cancelAnimationFrame(playbackRafRef.current);
      playbackRafRef.current = null;
    }

    const start = performance.now();
    let cancelled = false;

    function resolveSceneAt(elapsed: number) {
      if (!playAll || scenes.length <= 1) {
        setPlaybackSceneId(scene?.id ?? null);
        return;
      }
      let offset = 0;
      for (const s of scenes) {
        if (elapsed >= offset && elapsed < offset + s.durationMs) {
          setPlaybackSceneId(s.id);
          return;
        }
        offset += s.durationMs;
      }
      setPlaybackSceneId(scenes[scenes.length - 1]?.id ?? null);
    }

    function tick(now: number) {
      if (cancelled) return;
      let elapsed = now - start;

      if (playAll && loopPreview && duration > 0) {
        elapsed = elapsed % duration;
      }

      if (elapsed >= duration) {
        setPlaybackTimeMs(duration);
        if (playAll && loopPreview && duration > 0) {
          playbackRafRef.current = requestAnimationFrame(tick);
          return;
        }
        if (playAll) {
          setPlayAll(false);
          setPlaybackSceneId(null);
        }
        setPlaybackTimeMs(0);
        return;
      }

      setPlaybackTimeMs(elapsed);
      resolveSceneAt(elapsed);
      playbackRafRef.current = requestAnimationFrame(tick);
    }

    playbackRafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (playbackRafRef.current !== null) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
    };
  }, [
    playAll,
    replayKey,
    loopPreview,
    state.scenes,
    state.timeline?.durationMs,
    state.activeSceneId,
  ]);

  const assetNote = hasAssets ? (assetNoteCache[assetNoteKey] ?? null) : null;
  const activeScene = state.scenes?.find((s) => s.id === (playbackSceneId ?? state.activeSceneId));
  const sceneLabel = activeScene
    ? `${activeScene.name}${playAll ? " · playing" : ""}`
    : undefined;

  function handlePlayAll() {
    setPlayAll(true);
    setPlaybackTimeMs(0);
    setPlaybackSceneId(state.scenes?.[0]?.id ?? null);
    setReplayKey((k) => k + 1);
  }

  const replaySceneMode = !playAll && replayKey > 0;

  return (
    <>
      <header className="border-b border-zinc-800/80 bg-zinc-950/80">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sklik HTML5 Banner Generator
            </p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-100">{state.name}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-500">{sizeLabel}</p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">
            Back to studio
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <p className="mb-3 text-center text-sm text-zinc-500">
          Náhled pouze ke čtení — úpravy v editoru nejsou k dispozici.
          {hasStoryboard ? ` · ${state.scenes!.length} scén` : ""}
        </p>
        {assetNote ? (
          <p className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-center text-xs text-amber-200">
            {assetNote}
          </p>
        ) : null}

        <div
          ref={containerRef}
          className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4 sm:p-8"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgb(63 63 70 / 0.35) 1px, transparent 0)",
            backgroundSize: "20px 20px",
            minHeight: "320px",
          }}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
            <BannerPreview
              state={state}
              replayKey={replayKey}
              loopPreview={loopPreview}
              playAll={playAll && hasStoryboard}
              playbackSceneId={playbackSceneId}
              publicMode
            />
          </div>
        </div>

        {hasStoryboard ? (
          <>
            <PlaybackTimeline
              state={state}
              playAll={playAll}
              playbackTimeMs={playbackTimeMs}
              playbackSceneId={playbackSceneId}
              replaySceneMode={replaySceneMode}
            />
            <PreviewPlaybackControls
              loop={loopPreview}
              onReplay={() => {
                setPlayAll(false);
                setPlaybackTimeMs(0);
                setReplayKey((k) => k + 1);
              }}
              onReplayScene={() => {
                setPlayAll(false);
                setPlaybackTimeMs(0);
                setPlaybackSceneId(state.activeSceneId ?? state.scenes?.[0]?.id ?? null);
                setReplayKey((k) => k + 1);
              }}
              onPlayAll={handlePlayAll}
              onToggleLoop={() => setLoopPreview((v) => !v)}
              sceneLabel={
                playAll
                  ? `Playing all · ${totalStoryboardDurationMs(state)}ms`
                  : sceneLabel
              }
            />
          </>
        ) : null}
      </main>
    </>
  );
}

export function PublicPreviewShell({ shareId }: PublicPreviewShellProps) {
  const isClient = useIsClient();
  const project = usePreviewProject(shareId);

  if (!isClient) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-zinc-500">Loading preview…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Preview not found</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          This preview link is invalid or the banner project was removed.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <PreviewContent state={projectToEditorState(project)} />
    </div>
  );
}
