"use client";

import CollapsiblePanel from "@/components/CollapsiblePanel";
import { clamp } from "@/utils/time";

export default function BackgroundMusicPanel({
  backgroundMusicFile,
  backgroundMusicUrl,
  setBackgroundMusicFile,
  setBackgroundMusicUrl,
  backgroundMusicVolumePct,
  setBackgroundMusicVolumePct,
}) {
  function handleFileSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (backgroundMusicUrl) {
      URL.revokeObjectURL(backgroundMusicUrl);
    }

    setBackgroundMusicFile(file);
    setBackgroundMusicUrl(URL.createObjectURL(file));
  }

  function removeMusic() {
    if (backgroundMusicUrl) {
      URL.revokeObjectURL(backgroundMusicUrl);
    }

    setBackgroundMusicFile(null);
    setBackgroundMusicUrl("");
  }

  return (
    <CollapsiblePanel
      title="Background Music"
      subtitle={
        backgroundMusicFile
          ? `${backgroundMusicFile.name} at ${Math.round(backgroundMusicVolumePct)}%`
          : "Loops under the voiceover during preview and export."
      }
      rightContent={
        backgroundMusicUrl ? (
          <button
            type="button"
            onClick={removeMusic}
            className="rounded-md border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-300/20"
          >
            Remove
          </button>
        ) : null
      }
    >

      <label className="block cursor-pointer rounded-md border border-dashed border-white/15 bg-black/20 p-4 text-sm text-slate-300 transition hover:border-cyan-300/60 hover:bg-cyan-400/5">
        <input
          className="sr-only"
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/webm,audio/ogg,.mp3,.wav,.m4a,.mp4,.webm,.ogg"
          onChange={handleFileSelect}
        />
        <span className="block font-semibold text-white">
          {backgroundMusicFile ? backgroundMusicFile.name : "Choose music track"}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          MP3, WAV, M4A, MP4, WebM, or OGG
        </span>
      </label>

      <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
        <div className="flex items-center justify-between gap-3">
          <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Music level
          </label>
          <span className="text-xs font-bold text-slate-200">
            {Math.round(backgroundMusicVolumePct)}% of voice
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={backgroundMusicVolumePct}
          onChange={(event) =>
            setBackgroundMusicVolumePct(clamp(Number(event.target.value), 0, 100))
          }
          className="mt-3 w-full accent-cyan-300"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          15-25% usually keeps speech clear. Set 0% to keep the track loaded but muted.
        </p>
      </div>
    </CollapsiblePanel>
  );
}
