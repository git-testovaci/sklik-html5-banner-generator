"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { formatBannerSize } from "@/lib/banner-sizes";
import { projectToEditorState } from "@/lib/animation/timeline-utils";
import { totalStoryboardDurationMs } from "@/lib/animation/storyboard-utils";
import { collectAssetWarnings } from "@/lib/assets/asset-validation";
import { usePlaybackController } from "@/lib/playback/use-playback-controller";
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
  const [loopPreview, setLoopPreview] = useState(state.timeline?.loop ?? false);
  const sizeLabel = formatBannerSize(state.width, state.height);
  const hasAssets = (state.assets ?? []).length > 0;
  const hasStoryboard = (state.scenes ?? []).length > 1;
  const assetNoteKey = (state.assets ?? []).map((a) => a.id).join(",");
  const [assetNoteCache, setAssetNoteCache] = useState<Record<string, string>>({});

  const playback = usePlaybackController({
    scenes: state.scenes,
    loop: loopPreview,
    timelineDurationMs: state.timeline?.durationMs ?? 3000,
    activeSceneId: state.activeSceneId,
  });

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

  const assetNote = hasAssets ? (assetNoteCache[assetNoteKey] ?? null) : null;
  const activeScene = state.scenes?.find(
    (s) => s.id === (playback.playbackSceneId ?? state.activeSceneId),
  );
  const sceneLabel = activeScene ? activeScene.name : undefined;

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
            Zpět do studia
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
              replayKey={playback.replayKey}
              loopPreview={loopPreview}
              playAll={playback.playAllView && hasStoryboard}
              playbackSceneId={playback.playbackSceneId}
              publicMode
            />
          </div>
        </div>

        {hasStoryboard ? (
          <>
            <div className="mt-4">
              <PlaybackTimeline
                state={state}
                mode={playback.mode}
                playAllView={playback.playAllView}
                playbackTimeMs={playback.playbackTimeMs}
                playbackSceneId={playback.playbackSceneId}
              />
            </div>
            <PreviewPlaybackControls
              mode={playback.mode}
              loop={loopPreview}
              playbackTimeMs={playback.playbackTimeMs}
              onPlayAll={playback.playAll}
              onReplayScene={playback.replayScene}
              onPause={playback.pause}
              onResume={playback.resume}
              onStop={playback.stop}
              onToggleLoop={setLoopPreview}
              sceneLabel={
                playback.mode === "playing-all"
                  ? `Přehrávání vše · ${(totalStoryboardDurationMs(state) / 1000).toFixed(1)} s`
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
        <p className="text-sm text-zinc-500">Načítání náhledu…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">Náhled nenalezen</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">
          Odkaz na náhled je neplatný nebo byl projekt odstraněn.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
        >
          Zpět na přehled
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
