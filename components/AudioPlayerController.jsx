"use client";

import { useEffect, useRef } from "react";
import { clamp, msToTime } from "@/utils/time";

export default function AudioPlayerController({
  audioUrl,
  currentTimeMs,
  setCurrentTimeMs,
  durationMs,
  setDurationMs,
  isPlaying,
  setIsPlaying,
  selectedLineId,
  lines,
  setLines,
  onSeek,
  seekCommand,
  backgroundMusicUrl,
  backgroundMusicVolumePct,
}) {
  const audioRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const maxDuration = Math.max(1, durationMs || 1);
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
    const audio = audioRef.current;

    if (!audio || !seekCommand) {
      return;
    }

    audio.currentTime = clamp(seekCommand.ms, 0, maxDuration) / 1000;
    syncBackgroundMusic(audio.currentTime);
  }, [seekCommand, maxDuration]);

  useEffect(() => {
    const music = backgroundMusicRef.current;

    if (music) {
      music.volume = musicVolume;
    }
  }, [musicVolume, backgroundMusicUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    const music = backgroundMusicRef.current;

    if (audio && music && isPlaying && !audio.paused) {
      music.volume = musicVolume;
      syncBackgroundMusic(audio.currentTime);
      music.play().catch(() => {});
    }
  }, [backgroundMusicUrl]);

  async function togglePlayback() {
    const audio = audioRef.current;
    const music = backgroundMusicRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        if (durationMs && currentTimeMs >= durationMs - 80) {
          audio.currentTime = 0;
          onSeek(0);
        }

        if (music) {
          music.volume = musicVolume;
          syncBackgroundMusic(audio.currentTime);
        }

        await audio.play();
        if (music) {
          await music.play().catch(() => {});
        }
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      if (music) {
        music.pause();
      }
      setIsPlaying(false);
    }
  }

  function restart() {
    const audio = audioRef.current;
    const music = backgroundMusicRef.current;

    if (audio) {
      audio.currentTime = 0;
    }

    if (music) {
      music.currentTime = 0;
    }

    onSeek(0);
  }

  async function playFullPreview() {
    const audio = audioRef.current;
    const music = backgroundMusicRef.current;

    if (!audio) {
      return;
    }

    audio.currentTime = 0;
    if (music) {
      music.volume = musicVolume;
      music.currentTime = 0;
    }
    onSeek(0);

    try {
      await audio.play();
      if (music) {
        await music.play().catch(() => {});
      }
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  function handleSeek(event) {
    onSeek(Number(event.target.value));
  }

  function updateSelectedLineTiming(field) {
    if (!selectedLineId) {
      return;
    }

    setLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== selectedLineId) {
          return line;
        }

        if (field === "startMs") {
          const nextStart = clamp(currentTimeMs, 0, Math.max(0, line.endMs - 120));

          return {
            ...line,
            startMs: nextStart,
            syncStatus: "manual",
            matchScore: null,
            matchedWords: [],
          };
        }

        const nextEnd = clamp(
          currentTimeMs,
          line.startMs + 120,
          durationMs ? durationMs : Number.MAX_SAFE_INTEGER
        );

        return {
          ...line,
          endMs: nextEnd,
          syncStatus: "manual",
          matchScore: null,
          matchedWords: [],
        };
      })
    );
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20">
      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={(event) => {
            const nextDurationMs = Math.round(event.currentTarget.duration * 1000);
            if (Number.isFinite(nextDurationMs) && nextDurationMs > 0) {
              setDurationMs(nextDurationMs);
            }
          }}
          onTimeUpdate={(event) => {
            const nextTimeMs = Math.round(event.currentTarget.currentTime * 1000);
            const music = backgroundMusicRef.current;
            setCurrentTimeMs(nextTimeMs);

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
      ) : null}

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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!audioUrl}
            className="h-10 rounded-md bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={restart}
            disabled={!audioUrl}
            className="h-10 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600"
          >
            Restart
          </button>
          <button
            type="button"
            onClick={playFullPreview}
            disabled={!audioUrl}
            className="h-10 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
          >
            Play Full Preview
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min="0"
            max={maxDuration}
            step="10"
            value={clamp(currentTimeMs, 0, maxDuration)}
            onChange={handleSeek}
            disabled={!audioUrl}
            className="w-full accent-cyan-300 disabled:opacity-40"
          />
          <div className="mt-1 flex justify-between text-xs font-semibold text-slate-500">
            <span>{msToTime(currentTimeMs)}</span>
            <span>{msToTime(durationMs)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateSelectedLineTiming("startMs")}
            disabled={!selectedLineId}
            className="h-10 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 text-xs font-black uppercase tracking-[0.1em] text-emerald-200 transition hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
          >
            Set Start Here
          </button>
          <button
            type="button"
            onClick={() => updateSelectedLineTiming("endMs")}
            disabled={!selectedLineId}
            className="h-10 rounded-md border border-rose-300/30 bg-rose-300/10 px-3 text-xs font-black uppercase tracking-[0.1em] text-rose-200 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
          >
            Set End Here
          </button>
        </div>
      </div>
    </section>
  );
}
