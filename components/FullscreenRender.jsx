"use client";

import { useEffect, useRef, useState } from "react";
import VideoPreview from "@/components/VideoPreview";
import { clamp, msToTime } from "@/utils/time";

export default function FullscreenRender({
  isOpen,
  setIsOpen,
  audioUrl,
  lines,
  currentTimeMs,
  setCurrentTimeMs,
  durationMs,
  setDurationMs,
  setIsPlaying,
  selectedLineId,
  backgroundMusicUrl,
  backgroundMusicVolumePct,
}) {
  const audioRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const [renderFormat, setRenderFormat] = useState("reels");
  const isYoutube = renderFormat === "youtube";
  const musicVolume = clamp((Number(backgroundMusicVolumePct) || 0) / 100, 0, 1);

  function syncBackgroundMusic(targetSeconds) {
    const music = backgroundMusicRef.current;

    if (!music) {
      return;
    }

    const musicDuration = Number.isFinite(music.duration) ? music.duration : 0;
    const nextTime =
      musicDuration > 0 ? Math.max(0, targetSeconds) % musicDuration : 0;

    try {
      music.currentTime = nextTime;
    } catch {
      // Some browser-decoded audio sources may reject immediate seeks.
    }
  }

  useEffect(() => {
    if (!isOpen || !audioRef.current) {
      return;
    }

    audioRef.current.currentTime = clamp(currentTimeMs, 0, durationMs || currentTimeMs) / 1000;
    syncBackgroundMusic(audioRef.current.currentTime);
  }, [isOpen]);

  useEffect(() => {
    const music = backgroundMusicRef.current;

    if (music) {
      music.volume = musicVolume;
    }
  }, [musicVolume, backgroundMusicUrl]);

  async function enterBrowserFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
      >
        Open Fullscreen Render
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                THE RETURN Render
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {msToTime(currentTimeMs)} / {msToTime(durationMs)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 rounded-md border border-white/10 bg-white/5 p-1">
                {[
                  ["reels", "Reels"],
                  ["youtube", "YouTube"],
                ].map(([format, label]) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setRenderFormat(format)}
                    className={`rounded px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] transition ${
                      renderFormat === format
                        ? "bg-cyan-300 text-slate-950"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={enterBrowserFullscreen}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10"
              >
                Browser Fullscreen
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 items-center justify-center p-4">
            <div
              className={`${
                isYoutube
                  ? "aspect-video w-full max-w-[92vw]"
                  : "aspect-[9/16] h-full max-h-[calc(100vh-150px)] w-auto max-w-[92vw]"
              }`}
            >
              <VideoPreview
                lines={lines}
                currentTimeMs={currentTimeMs}
                selectedLineId={selectedLineId}
                format={renderFormat}
                className="h-full rounded-none border-white/5"
              />
            </div>
          </main>

          <footer className="shrink-0 border-t border-white/10 bg-black px-4 py-3">
            {audioUrl ? (
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
                onLoadedMetadata={(event) => {
                  const nextDurationMs = Math.round(event.currentTarget.duration * 1000);
                  if (Number.isFinite(nextDurationMs) && nextDurationMs > 0) {
                    setDurationMs(nextDurationMs);
                  }
                }}
                onTimeUpdate={(event) => {
                  setCurrentTimeMs(Math.round(event.currentTarget.currentTime * 1000));
                  const music = backgroundMusicRef.current;

                  if (music && !event.currentTarget.paused) {
                    const musicDuration = Number.isFinite(music.duration)
                      ? music.duration
                      : 0;
                    const expectedMusicTime =
                      musicDuration > 0
                        ? event.currentTarget.currentTime % musicDuration
                        : 0;

                    if (
                      musicDuration > 0 &&
                      Math.abs(music.currentTime - expectedMusicTime) > 0.35
                    ) {
                      syncBackgroundMusic(event.currentTarget.currentTime);
                    }
                  }
                }}
                onPlay={() => {
                  const music = backgroundMusicRef.current;
                  if (music) {
                    music.volume = musicVolume;
                    syncBackgroundMusic(audioRef.current?.currentTime || 0);
                    music.play().catch(() => {});
                  }
                  setIsPlaying(true);
                }}
                onPause={() => {
                  backgroundMusicRef.current?.pause();
                  setIsPlaying(false);
                }}
                onEnded={() => {
                  backgroundMusicRef.current?.pause();
                  setIsPlaying(false);
                }}
              />
            ) : (
              <p className="text-center text-sm text-slate-500">
                Upload audio before recording the final render.
              </p>
            )}
            {backgroundMusicUrl ? (
              <audio
                ref={backgroundMusicRef}
                src={backgroundMusicUrl}
                loop
                preload="auto"
                onLoadedMetadata={(event) => {
                  event.currentTarget.volume = musicVolume;
                  syncBackgroundMusic(currentTimeMs / 1000);
                }}
              />
            ) : null}
          </footer>
        </div>
      ) : null}
    </>
  );
}
