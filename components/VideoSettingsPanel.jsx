"use client";

import CollapsiblePanel from "@/components/CollapsiblePanel";
import VisualEffectsControls from "@/components/VisualEffectsControls";
import { FONT_OPTIONS } from "@/utils/fonts";
import { clamp } from "@/utils/time";

function FieldLabel({ children }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
      {children}
    </label>
  );
}

export default function VideoSettingsPanel({
  videoSettings,
  onChangeSetting,
  lineCount,
  imagePlan = [],
  onApplyImagePlan,
}) {
  return (
    <CollapsiblePanel
      title="Video Settings"
      subtitle={`Global defaults for ${lineCount} current lines.`}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Text color</FieldLabel>
            <input
              type="color"
              value={videoSettings.textColor}
              onChange={(event) => onChangeSetting("textColor", event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/35 p-1"
            />
          </div>
          <div>
            <FieldLabel>Text size</FieldLabel>
            <input
              type="number"
              min="12"
              max="96"
              value={videoSettings.textSize}
              onChange={(event) =>
                onChangeSetting("textSize", clamp(Number(event.target.value), 12, 96))
              }
              className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Font</FieldLabel>
          <select
            value={videoSettings.fontFamily}
            onChange={(event) => onChangeSetting("fontFamily", event.target.value)}
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
                onClick={() => onChangeSetting("textPosition", position)}
                className={`rounded-md border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                  videoSettings.textPosition === position
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
                onClick={() => onChangeSetting("captionReveal", mode)}
                className={`rounded-md border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
                  videoSettings.captionReveal === mode
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
          values={videoSettings}
          onChange={onChangeSetting}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>Image opacity</FieldLabel>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={videoSettings.imageOpacity}
              onChange={(event) =>
                onChangeSetting("imageOpacity", clamp(Number(event.target.value), 0, 1))
              }
              className="mt-2 w-full accent-cyan-300"
            />
            <p className="mt-1 text-xs text-slate-500">
              {videoSettings.imageOpacity.toFixed(2)}
            </p>
          </div>
          <div>
            <FieldLabel>Overlay opacity</FieldLabel>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={videoSettings.overlayOpacity}
              onChange={(event) =>
                onChangeSetting("overlayOpacity", clamp(Number(event.target.value), 0, 1))
              }
              className="mt-2 w-full accent-cyan-300"
            />
            <p className="mt-1 text-xs text-slate-500">
              {videoSettings.overlayOpacity.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/25 p-3 text-xs text-slate-400">
          Current lines using video settings:{" "}
          <span className="font-bold text-slate-200">{lineCount}</span>
        </div>

        {onApplyImagePlan ? (
          <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.055] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                  40s Image Plan
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Applies one shared image track to both previews.
                </p>
              </div>
              <button
                type="button"
                disabled={!lineCount}
                onClick={onApplyImagePlan}
                className="rounded-md border border-cyan-300/40 bg-cyan-300 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
              >
                Apply
              </button>
            </div>
            {imagePlan.length ? (
              <div className="mt-3 grid gap-1.5 text-[11px] text-slate-400">
                {imagePlan.map((item) => (
                  <div
                    key={`${item.startMs}-${item.media}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="font-semibold text-slate-300">{item.label}</span>
                    <span>{(item.startMs / 1000).toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </CollapsiblePanel>
  );
}
