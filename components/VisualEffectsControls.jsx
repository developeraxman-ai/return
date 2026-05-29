"use client";

import { DEFAULT_VISUALS } from "@/utils/script";
import { clamp } from "@/utils/time";

const SHADOW_OPTIONS = [
  ["none", "None"],
  ["soft", "Soft"],
  ["strong", "Strong"],
  ["glow", "Glow"],
];

const MOTION_OPTIONS = [
  ["none", "Still"],
  ["zoom-in", "Zoom in"],
  ["zoom-out", "Zoom out"],
  ["drift-up", "Drift up"],
  ["drift-left", "Drift left"],
  ["drift-right", "Drift right"],
];

function FieldLabel({ children }) {
  return (
    <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
      {children}
    </label>
  );
}

function getValue(values, field) {
  return values?.[field] ?? DEFAULT_VISUALS[field];
}

function SegmentControl({ label, value, options, onChange }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`rounded-md border px-2 py-2 text-[11px] font-black uppercase tracking-[0.08em] transition ${
              value === optionValue
                ? "border-cyan-300/60 bg-cyan-300/15 text-cyan-100"
                : "border-white/10 bg-black/25 text-slate-400 hover:bg-white/5"
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs font-semibold text-slate-500">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(clamp(Number(event.target.value), Number(min), Number(max)))
        }
        className="mt-2 w-full accent-cyan-300"
      />
    </div>
  );
}

export default function VisualEffectsControls({ values, onChange }) {
  const textShadowMode = getValue(values, "textShadowMode");
  const textShadowColor = getValue(values, "textShadowColor");
  const textStrokeWidth = getValue(values, "textStrokeWidth");
  const textStrokeColor = getValue(values, "textStrokeColor");
  const imageMotion = getValue(values, "imageMotion");
  const imageZoom = getValue(values, "imageZoom");
  const imageBlur = getValue(values, "imageBlur");
  const imageBrightness = getValue(values, "imageBrightness");
  const imageContrast = getValue(values, "imageContrast");
  const imageSaturation = getValue(values, "imageSaturation");
  const vignetteOpacity = getValue(values, "vignetteOpacity");

  return (
    <div className="space-y-4 rounded-md border border-white/10 bg-black/20 p-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          Text Depth
        </p>
        <div className="mt-3 space-y-3">
          <SegmentControl
            label="Text shadow"
            value={textShadowMode}
            options={SHADOW_OPTIONS}
            onChange={(value) => onChange("textShadowMode", value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Shadow color</FieldLabel>
              <input
                type="color"
                value={textShadowColor}
                onChange={(event) => onChange("textShadowColor", event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/35 p-1"
              />
            </div>
            <div>
              <FieldLabel>Stroke color</FieldLabel>
              <input
                type="color"
                value={textStrokeColor}
                onChange={(event) => onChange("textStrokeColor", event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-black/35 p-1"
              />
            </div>
          </div>

          <RangeControl
            label="Text stroke"
            min="0"
            max="6"
            step="0.25"
            value={textStrokeWidth}
            displayValue={`${Number(textStrokeWidth).toFixed(1)}px`}
            onChange={(value) => onChange("textStrokeWidth", value)}
          />
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          Image Motion
        </p>
        <div className="mt-3 space-y-3">
          <SegmentControl
            label="Motion"
            value={imageMotion}
            options={MOTION_OPTIONS}
            onChange={(value) => onChange("imageMotion", value)}
          />
          <RangeControl
            label="Motion amount"
            min="1"
            max="1.25"
            step="0.01"
            value={imageZoom}
            displayValue={`${Math.round((Number(imageZoom) - 1) * 100)}%`}
            onChange={(value) => onChange("imageZoom", value)}
          />
        </div>
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          Image Effects
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RangeControl
            label="Blur"
            min="0"
            max="8"
            step="0.25"
            value={imageBlur}
            displayValue={`${Number(imageBlur).toFixed(1)}px`}
            onChange={(value) => onChange("imageBlur", value)}
          />
          <RangeControl
            label="Brightness"
            min="0.5"
            max="1.35"
            step="0.01"
            value={imageBrightness}
            displayValue={`${Math.round(Number(imageBrightness) * 100)}%`}
            onChange={(value) => onChange("imageBrightness", value)}
          />
          <RangeControl
            label="Contrast"
            min="0.75"
            max="1.6"
            step="0.01"
            value={imageContrast}
            displayValue={`${Math.round(Number(imageContrast) * 100)}%`}
            onChange={(value) => onChange("imageContrast", value)}
          />
          <RangeControl
            label="Saturation"
            min="0"
            max="1.8"
            step="0.01"
            value={imageSaturation}
            displayValue={`${Math.round(Number(imageSaturation) * 100)}%`}
            onChange={(value) => onChange("imageSaturation", value)}
          />
          <div className="sm:col-span-2">
            <RangeControl
              label="Vignette"
              min="0"
              max="0.75"
              step="0.01"
              value={vignetteOpacity}
              displayValue={Number(vignetteOpacity).toFixed(2)}
              onChange={(value) => onChange("vignetteOpacity", value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
