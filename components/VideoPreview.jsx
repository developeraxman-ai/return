"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getActiveLine,
  getVisualLineForTime,
} from "@/utils/time";
import { DEFAULT_FONT_FAMILY } from "@/utils/fonts";
import { getLineMedia } from "@/utils/media";
import { DEFAULT_VISUALS } from "@/utils/script";

const MEDIA_TRANSITION_MS = 1000;

function getAspectClass(format) {
  return format === "youtube" ? "aspect-video" : "aspect-[9/16]";
}

function getCaptionMaxWidth(format) {
  return format === "youtube" ? "w-[78%]" : "w-[85%]";
}

function getCaptionScale(format) {
  return format === "youtube" ? 0.72 : 1;
}

function getPositionClasses(position) {
  if (position === "top") {
    return "top-[12%]";
  }

  if (position === "bottom") {
    return "bottom-[12%]";
  }

  return "top-1/2 -translate-y-1/2";
}

function getLineValue(line, field) {
  return line?.[field] ?? DEFAULT_VISUALS[field];
}

function hexToRgb(hex) {
  const raw = String(hex || "#000000").replace("#", "").trim();
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : raw;
  const value = Number.parseInt(normalized, 16);

  if (!Number.isFinite(value)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getTextShadow(line) {
  const mode = getLineValue(line, "textShadowMode");
  const color = getLineValue(line, "textShadowColor");

  if (mode === "none") {
    return "none";
  }

  if (mode === "soft") {
    return `0 2px 8px ${rgba(color, 0.62)}, 0 1px 2px rgba(0,0,0,0.72)`;
  }

  if (mode === "glow") {
    return `0 0 14px ${rgba(color, 0.82)}, 0 4px 18px rgba(0,0,0,0.78)`;
  }

  return `0 4px 18px ${rgba(color, 0.82)}, 0 1px 2px rgba(0,0,0,0.95)`;
}

function clampUnit(value, min, max) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.min(Math.max(numeric, min), max);
}

function getMediaId(line, format) {
  const resolved = getLineMedia(line, format);
  return `${resolved.mediaType}:${resolved.media}`;
}

function getMediaMotionWindow(lines, line, format) {
  const sortedLines = Array.isArray(lines)
    ? [...lines].sort((a, b) => (a.startMs || 0) - (b.startMs || 0))
    : [];
  const currentIndex = sortedLines.findIndex((item) => item.id === line?.id);

  if (currentIndex === -1) {
    const startMs = Number(line?.startMs) || 0;
    const endMs = Math.max(startMs + 1000, Number(line?.endMs) || startMs + 1000);
    return { startMs, endMs };
  }

  const mediaId = getMediaId(sortedLines[currentIndex], format);
  let firstIndex = currentIndex;
  let lastIndex = currentIndex;

  while (firstIndex > 0 && getMediaId(sortedLines[firstIndex - 1], format) === mediaId) {
    firstIndex -= 1;
  }

  while (
    lastIndex < sortedLines.length - 1 &&
    getMediaId(sortedLines[lastIndex + 1], format) === mediaId
  ) {
    lastIndex += 1;
  }

  const startMs = Number(sortedLines[firstIndex].startMs) || 0;
  const nextDifferentLine = sortedLines[lastIndex + 1];
  const naturalEndMs = Number(sortedLines[lastIndex].endMs) || startMs + 1000;
  const nextStartMs = nextDifferentLine ? Number(nextDifferentLine.startMs) || 0 : 0;
  const endMs = Math.max(naturalEndMs, nextStartMs, startMs + 1000);

  return { startMs, endMs };
}

function getMediaTransform(line, lines, format, currentTimeMs, layerState) {
  const motion = getLineValue(line, "imageMotion");
  const zoomEnd = clampUnit(getLineValue(line, "imageZoom"), 1, 1.35);
  const zoomDelta = zoomEnd - 1;
  const motionWindow = getMediaMotionWindow(lines, line, format);
  const progress = clampUnit(
    ((Number(currentTimeMs) || 0) - motionWindow.startMs) /
      Math.max(1, motionWindow.endMs - motionWindow.startMs),
    0,
    1
  );

  let scale = 1;
  let x = 0;
  let y = 0;

  if (motion === "zoom-in") {
    scale = 1 + zoomDelta * progress;
  } else if (motion === "zoom-out") {
    scale = zoomEnd - zoomDelta * progress;
  } else if (motion === "drift-up") {
    scale = 1 + zoomDelta * 0.82;
    y = 2.2 - progress * 4.4;
  } else if (motion === "drift-left") {
    scale = 1 + zoomDelta * 0.82;
    x = 2.2 - progress * 4.4;
  } else if (motion === "drift-right") {
    scale = 1 + zoomDelta * 0.82;
    x = -2.2 + progress * 4.4;
  }

  if (layerState === "leaving") {
    scale += 0.015;
  }

  return `translate3d(${x.toFixed(3)}%, ${y.toFixed(3)}%, 0) scale(${scale.toFixed(4)})`;
}

function getImageFilter(line) {
  const blur = clampUnit(getLineValue(line, "imageBlur"), 0, 12);
  const brightness = clampUnit(getLineValue(line, "imageBrightness"), 0.35, 1.75);
  const contrast = clampUnit(getLineValue(line, "imageContrast"), 0.5, 2);
  const saturation = clampUnit(getLineValue(line, "imageSaturation"), 0, 2.5);

  return `blur(${blur}px) brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
}

function getWordRevealText(line, currentTimeMs) {
  const text = String(line?.text || "");

  if (!line || !text) {
    return {
      text: "",
      isComplete: true,
    };
  }

  if (line.captionReveal === "instant") {
    return {
      text,
      isComplete: true,
    };
  }

  const words = text.match(/\S+\s*/g) || [];
  const lineDurationMs = Math.max(300, (line.endMs || 0) - (line.startMs || 0));
  const revealDurationMs = Math.max(
    450,
    Math.min(lineDurationMs * 0.85, words.length * 260)
  );
  const elapsedMs = Math.max(0, currentTimeMs - (line.startMs || 0));
  const progress = Math.min(1, elapsedMs / revealDurationMs);
  const visibleWordCount = Math.min(
    words.length,
    Math.ceil(words.length * progress)
  );

  return {
    text: words.slice(0, visibleWordCount).join("").trimEnd(),
    isComplete: visibleWordCount >= words.length,
  };
}

function MediaLayer({
  line,
  media,
  mediaType,
  layerState,
  lines,
  format,
  currentTimeMs,
}) {
  if (!line) {
    return null;
  }

  const commonClass =
    "absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-linear";
  const opacity = layerState === "visible" ? getLineValue(line, "imageOpacity") : 0;
  const transform = getMediaTransform(line, lines, format, currentTimeMs, layerState);
  const filter = getImageFilter(line);
  const hideMissingMedia = (event) => {
    event.currentTarget.style.display = "none";
  };

  if (mediaType === "video") {
    return (
      <video
        src={media}
        className={commonClass}
        style={{ opacity, transform, filter }}
        onError={hideMissingMedia}
        muted
        loop
        playsInline
        autoPlay
      />
    );
  }

  return (
    <img
      src={media}
      alt=""
      className={commonClass}
      style={{ opacity, transform, filter }}
      onError={hideMissingMedia}
    />
  );
}

export default function VideoPreview({
  lines,
  currentTimeMs,
  selectedLineId,
  format = "reels",
  className = "",
}) {
  const activeLine = useMemo(
    () => getActiveLine(lines, currentTimeMs),
    [lines, currentTimeMs]
  );
  const visualLine = useMemo(
    () => getVisualLineForTime(lines, currentTimeMs),
    [lines, currentTimeMs]
  );
  const currentMediaRef = useRef(null);
  const [mediaLayers, setMediaLayers] = useState([]);
  const [captionLine, setCaptionLine] = useState(activeLine);
  const [isCaptionVisible, setIsCaptionVisible] = useState(Boolean(activeLine));

  useEffect(() => {
    if (!visualLine) {
      currentMediaRef.current = null;
      setMediaLayers([]);
      return;
    }

    const previousMedia = currentMediaRef.current;
    const resolvedMedia = getLineMedia(visualLine, format);
    const nextMedia = {
      id: `${resolvedMedia.mediaType}:${resolvedMedia.media}`,
      line: visualLine,
      media: resolvedMedia.media,
      mediaType: resolvedMedia.mediaType,
    };

    if (!previousMedia) {
      currentMediaRef.current = nextMedia;
      setMediaLayers([{ ...nextMedia, state: "visible" }]);
      return;
    }

    if (previousMedia.id === nextMedia.id) {
      currentMediaRef.current = nextMedia;
      setMediaLayers((currentLayers) =>
        currentLayers.map((layer) =>
          layer.id === nextMedia.id
            ? {
                ...layer,
                line: visualLine,
                media: nextMedia.media,
                mediaType: nextMedia.mediaType,
                state: "visible",
              }
            : layer
        )
      );
      return;
    }

    currentMediaRef.current = nextMedia;
    setMediaLayers([
      { ...previousMedia, state: "leaving" },
      { ...nextMedia, state: "entering" },
    ]);

    const frameId = requestAnimationFrame(() => {
      setMediaLayers((currentLayers) =>
        currentLayers.map((layer) =>
          layer.id === nextMedia.id ? { ...layer, state: "visible" } : layer
        )
      );
    });

    const timeoutId = window.setTimeout(() => {
      setMediaLayers([{ ...nextMedia, state: "visible" }]);
    }, MEDIA_TRANSITION_MS);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [visualLine, format]);

  useEffect(() => {
    if (activeLine) {
      setCaptionLine(activeLine);
      setIsCaptionVisible(true);
      return;
    }

    setIsCaptionVisible(false);
  }, [activeLine]);

  if (!visualLine) {
    return (
      <div
        className={`relative flex ${getAspectClass(format)} w-full overflow-hidden rounded-lg border border-white/10 bg-black shadow-2xl shadow-black/40 ${className}`}
      >
        <div className="m-auto text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
            No active line
          </p>
          <p className="mt-2 text-xs text-slate-700">
            Move the playhead over a timed script line.
          </p>
        </div>
      </div>
    );
  }

  const positionClasses = getPositionClasses(captionLine?.textPosition);
  const isSelected = visualLine.id === selectedLineId;
  const captionFontSize = Math.round(
    getLineValue(captionLine, "textSize") * getCaptionScale(format)
  );
  const revealedCaption = getWordRevealText(activeLine, currentTimeMs);
  const captionText =
    activeLine && captionLine?.id === activeLine.id
      ? revealedCaption.text
      : captionLine?.text || "";

  return (
    <div
      className={`relative ${getAspectClass(format)} w-full overflow-hidden rounded-lg border bg-black shadow-2xl shadow-black/40 transition ${
        isSelected ? "border-cyan-300/60" : "border-white/10"
      } ${className}`}
    >
      {mediaLayers.map((layer) => (
        <MediaLayer
          key={layer.id}
          line={layer.line}
          media={layer.media}
          mediaType={layer.mediaType}
          layerState={layer.state}
          lines={lines}
          format={format}
          currentTimeMs={currentTimeMs}
        />
      ))}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_48%,rgba(0,0,0,0.88)_100%)] transition-opacity duration-700 ease-in-out"
        style={{ opacity: getLineValue(visualLine, "vignetteOpacity") }}
      />
      <div
        className="absolute inset-0 bg-black transition-opacity duration-700 ease-in-out"
        style={{ opacity: getLineValue(visualLine, "overlayOpacity") }}
      />
      {captionLine ? (
        <div
          key={captionLine.id}
          className={`absolute left-1/2 ${getCaptionMaxWidth(format)} -translate-x-1/2 text-center font-black leading-[0.92] text-balance transition-opacity duration-200 ${
            isCaptionVisible ? "opacity-100 animate-[caption-in_260ms_ease-out]" : "opacity-0"
          } ${positionClasses}`}
          style={{
            color: getLineValue(captionLine, "textColor"),
            fontSize: `${captionFontSize}px`,
            fontFamily: getLineValue(captionLine, "fontFamily") || DEFAULT_FONT_FAMILY,
            textShadow: getTextShadow(captionLine),
            WebkitTextStroke: `${clampUnit(
              getLineValue(captionLine, "textStrokeWidth"),
              0,
              8
            )}px ${getLineValue(captionLine, "textStrokeColor")}`,
            paintOrder: "stroke fill",
          }}
        >
          {captionText}
        </div>
      ) : null}
    </div>
  );
}
