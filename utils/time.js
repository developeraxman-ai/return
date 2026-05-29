import { getLineMedia } from "@/utils/media";

export function msToTime(ms) {
  const safeMs = Math.max(0, Math.floor(Number(ms) || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((safeMs % 1000) / 100);

  return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

export function clamp(value, min, max) {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return min;
  }

  return Math.min(Math.max(numeric, min), max);
}

export function getActiveLine(lines, currentTimeMs) {
  const time = Number(currentTimeMs) || 0;

  return (
    lines.find((line) => time >= line.startMs && time < line.endMs) || null
  );
}

export function getVisualLineForTime(lines, currentTimeMs) {
  if (!Array.isArray(lines) || !lines.length) {
    return null;
  }

  const activeLine = getActiveLine(lines, currentTimeMs);

  if (activeLine) {
    return activeLine;
  }

  const time = Number(currentTimeMs) || 0;
  const timedLines = [...lines].sort((a, b) => (a.startMs || 0) - (b.startMs || 0));
  const previousLine = [...timedLines]
    .reverse()
    .find((line) => Number(line.startMs) <= time);

  return previousLine || timedLines[0] || null;
}

export function shouldTransitionBackground(previousLine, currentLine, format = "reels") {
  if (!previousLine || !currentLine) {
    return true;
  }

  const previousMedia = getLineMedia(previousLine, format);
  const currentMedia = getLineMedia(currentLine, format);

  return (
    previousMedia.media !== currentMedia.media ||
    previousMedia.mediaType !== currentMedia.mediaType
  );
}
