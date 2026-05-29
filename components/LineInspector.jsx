"use client";

import { useState } from "react";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import MediaLibrary from "@/components/MediaLibrary";
import VisualEffectsControls from "@/components/VisualEffectsControls";
import {
  getFormatLabel,
  getLineMedia,
  lineUsesMediaForFormat,
  setLineMediaForFormat,
} from "@/utils/media";
import { FONT_OPTIONS } from "@/utils/fonts";
import { clamp } from "@/utils/time";

function FieldLabel({ children }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
      {children}
    </label>
  );
}

export default function LineInspector({
  selectedLineId,
  lines,
  setLines,
  durationMs,
}) {
  const [mediaTarget, setMediaTarget] = useState("reels");
  const selectedLine = lines.find((line) => line.id === selectedLineId);
  const maxEnd = durationMs || Number.MAX_SAFE_INTEGER;

  function updateSelectedLine(updater) {
    if (!selectedLine) {
      return;
    }

    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === selectedLine.id
          ? {
              ...updater(line),
              syncStatus: "manual",
              matchScore: null,
              matchedWords: [],
            }
          : line
      )
    );
  }

  function updateField(field, value) {
    updateSelectedLine((line) => ({
      ...line,
      [field]: value,
    }));
  }

  function updateMediaChain(format, mediaPatch) {
    if (!selectedLine) {
      return;
    }

    setLines((currentLines) => {
      const selectedIndex = currentLines.findIndex(
        (line) => line.id === selectedLine.id
      );

      if (selectedIndex === -1) {
        return currentLines;
      }

      const sourceLine = currentLines[selectedIndex];
      const sourceMedia = getLineMedia(sourceLine, format);
      let shouldContinue = true;

      return currentLines.map((line, index) => {
        if (index < selectedIndex || !shouldContinue) {
          return line;
        }

        const lineUsesSourceMedia = lineUsesMediaForFormat(
          line,
          format,
          sourceMedia.media,
          sourceMedia.mediaType
        );

        if (!lineUsesSourceMedia) {
          shouldContinue = false;
          return line;
        }

        return {
          ...setLineMediaForFormat(line, format, mediaPatch),
        };
      });
    });
  }

  function updateStartMs(value) {
    updateSelectedLine((line) => {
      const startMs = clamp(Number(value), 0, Math.max(0, line.endMs - 120));
      return {
        ...line,
        startMs,
      };
    });
  }

  function updateEndMs(value) {
    updateSelectedLine((line) => {
      const endMs = clamp(Number(value), line.startMs + 120, maxEnd);
      return {
        ...line,
        endMs,
      };
    });
  }

  function handleMediaSelect(file) {
    updateMediaChain(mediaTarget, {
      media: file.path,
      mediaType: file.mediaType,
    });
  }

  if (!selectedLine) {
    return (
      <CollapsiblePanel
        title="Inspector"
        subtitle="Select a line to edit it."
      >
        <p className="mt-3 text-sm text-slate-500">Select a line to edit it.</p>
      </CollapsiblePanel>
    );
  }

  const selectedMedia = getLineMedia(selectedLine, mediaTarget);

  return (
    <CollapsiblePanel
      title="Inspector"
      subtitle={`Selected ${selectedLine.id}. Tune text, media, opacity, and timing.`}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Text</FieldLabel>
          <textarea
            value={selectedLine.text}
            rows={3}
            onChange={(event) => updateField("text", event.target.value)}
            className="mt-1 w-full resize-y rounded-md border border-white/10 bg-black/35 p-3 text-sm leading-5 text-slate-100 outline-none transition focus:border-cyan-300/60"
          />
        </div>

        <div className="rounded-md border border-white/10 bg-black/25 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                Format media
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Set separate assets for Reels and YouTube.
              </p>
            </div>
            <div className="grid grid-cols-2 rounded-md border border-white/10 bg-black/25 p-1">
              {["reels", "youtube"].map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setMediaTarget(format)}
                  className={`rounded px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] transition ${
                    mediaTarget === format
                      ? "bg-cyan-300 text-slate-950"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {getFormatLabel(format)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <FieldLabel>{getFormatLabel(mediaTarget)} media path</FieldLabel>
              <input
                value={selectedMedia.media}
                onChange={(event) =>
                  updateMediaChain(mediaTarget, { media: event.target.value })
                }
                className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
              />
            </div>
            <div>
              <FieldLabel>Media type</FieldLabel>
              <select
                value={selectedMedia.mediaType}
                onChange={(event) =>
                  updateMediaChain(mediaTarget, { mediaType: event.target.value })
                }
                className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
              >
                <option value="image">image</option>
                <option value="gif">gif</option>
                <option value="video">video</option>
              </select>
            </div>
          </div>
        </div>

        <MediaLibrary
          selectedPath={selectedMedia.media}
          onSelect={handleMediaSelect}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Text color</FieldLabel>
            <input
              type="color"
              value={selectedLine.textColor}
              onChange={(event) => updateField("textColor", event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/35 p-1"
            />
          </div>
          <div>
            <FieldLabel>Text size</FieldLabel>
            <input
              type="number"
              min="20"
              max="96"
              value={selectedLine.textSize}
              onChange={(event) =>
                updateField("textSize", clamp(Number(event.target.value), 20, 96))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Font</FieldLabel>
          <select
            value={selectedLine.fontFamily || FONT_OPTIONS[0].value}
            onChange={(event) => updateField("fontFamily", event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Text position</FieldLabel>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {["top", "center", "bottom"].map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => updateField("textPosition", position)}
                className={`rounded-md border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                  selectedLine.textPosition === position
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-black/25 text-slate-400 hover:bg-white/5"
                }`}
              >
                {position}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Caption reveal</FieldLabel>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {[
              ["word", "Word by word"],
              ["instant", "Instant"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateField("captionReveal", mode)}
                className={`rounded-md border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                  (selectedLine.captionReveal || "word") === mode
                    ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-black/25 text-slate-400 hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <VisualEffectsControls
          values={selectedLine}
          onChange={updateField}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Image opacity</FieldLabel>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedLine.imageOpacity}
              onChange={(event) =>
                updateField("imageOpacity", clamp(Number(event.target.value), 0, 1))
              }
              className="mt-2 w-full accent-cyan-300"
            />
            <p className="mt-1 text-xs text-slate-500">
              {selectedLine.imageOpacity.toFixed(2)}
            </p>
          </div>
          <div>
            <FieldLabel>Overlay opacity</FieldLabel>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedLine.overlayOpacity}
              onChange={(event) =>
                updateField("overlayOpacity", clamp(Number(event.target.value), 0, 1))
              }
              className="mt-2 w-full accent-cyan-300"
            />
            <p className="mt-1 text-xs text-slate-500">
              {selectedLine.overlayOpacity.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Start ms</FieldLabel>
            <input
              type="number"
              min="0"
              value={Math.round(selectedLine.startMs)}
              onChange={(event) => updateStartMs(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
          </div>
          <div>
            <FieldLabel>End ms</FieldLabel>
            <input
              type="number"
              min={selectedLine.startMs + 120}
              max={durationMs || undefined}
              value={Math.round(selectedLine.endMs)}
              onChange={(event) => updateEndMs(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
          <div className="flex justify-between gap-3">
            <span>Sync status</span>
            <span className="font-bold text-slate-200">{selectedLine.syncStatus}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Match score</span>
            <span className="font-bold text-slate-200">
              {selectedLine.matchScore == null ? "-" : selectedLine.matchScore}
            </span>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span>Matched words</span>
            <span className="font-bold text-slate-200">
              {selectedLine.matchedWords?.length || 0}
            </span>
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
