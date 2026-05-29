import { DEFAULT_FONT_FAMILY } from "@/utils/fonts";

export const DEFAULT_VISUALS = {
  media: {
    reels: "/media/dark-room.gif",
    youtube: "/media/dark-room.gif",
  },
  mediaType: {
    reels: "gif",
    youtube: "gif",
  },
  textColor: "#ffffff",
  textSize: 24,
  fontFamily: DEFAULT_FONT_FAMILY,
  textPosition: "bottom",
  captionReveal: "word",
  textShadowMode: "strong",
  textShadowColor: "#000000",
  textStrokeWidth: 1,
  textStrokeColor: "#000000",
  imageOpacity: 0.7,
  overlayOpacity: 0.4,
  imageMotion: "zoom-in",
  imageZoom: 1.08,
  imageBlur: 0,
  imageBrightness: 0.96,
  imageContrast: 1.08,
  imageSaturation: 1.05,
  vignetteOpacity: 0.25,
};

function createLineId(index) {
  return `line-${String(index + 1).padStart(3, "0")}`;
}

function getWordText(word) {
  return String(word?.word || word?.text || word || "").trim();
}

function getSeconds(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cleanLineText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function createLine({
  index,
  text,
  startMs,
  endMs,
  visualDefaults = DEFAULT_VISUALS,
  syncStatus = "manual",
  matchScore = null,
  matchedWords = [],
}) {
  const safeStartMs = Math.max(0, Math.round(startMs || 0));

  return {
    id: createLineId(index),
    text: cleanLineText(text),
    ...DEFAULT_VISUALS,
    ...visualDefaults,
    startMs: safeStartMs,
    endMs: Math.max(safeStartMs + 300, Math.round(endMs || 0)),
    syncStatus,
    matchScore,
    matchedWords,
  };
}

export function splitScriptIntoLines(
  scriptText,
  durationMs,
  visualDefaults = DEFAULT_VISUALS
) {
  const scriptLines = String(scriptText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hasDuration = Number(durationMs) > 0;
  const sliceMs = hasDuration
    ? Math.max(400, Math.floor(durationMs / Math.max(scriptLines.length, 1)))
    : 2000;

  return scriptLines.map((text, index) => {
    const startMs = hasDuration ? Math.round(index * sliceMs) : index * 2000;
    const isLast = index === scriptLines.length - 1;
    const endMs = hasDuration
      ? Math.round(isLast ? durationMs : (index + 1) * sliceMs)
      : startMs + 2000;

    return createLine({
      index,
      text,
      startMs,
      endMs: Math.max(startMs + 300, endMs),
      visualDefaults,
      syncStatus: "manual",
      matchScore: null,
      matchedWords: [],
    });
  });
}

function createLinesFromWhisperWords(words, visualDefaults = DEFAULT_VISUALS) {
  const normalizedWords = words
    .map((word) => ({
      word: getWordText(word),
      start: getSeconds(word?.start),
      end: getSeconds(word?.end),
    }))
    .filter((word) => word.word && word.end >= word.start);

  if (!normalizedWords.length) {
    return [];
  }

  const chunks = [];
  let chunk = [];

  normalizedWords.forEach((word, index) => {
    const previousWord = normalizedWords[index - 1];
    const pauseMs = previousWord ? (word.start - previousWord.end) * 1000 : 0;
    const chunkStart = chunk[0]?.start ?? word.start;
    const chunkDurationMs = (word.end - chunkStart) * 1000;
    const previousText = previousWord?.word || "";
    const previousEndedSentence = /[.!?]$/.test(previousText);
    const shouldBreakBefore =
      chunk.length > 0 &&
      (pauseMs > 650 ||
        chunk.length >= 7 ||
        chunkDurationMs > 3200 ||
        (previousEndedSentence && chunk.length >= 3));

    if (shouldBreakBefore) {
      chunks.push(chunk);
      chunk = [];
    }

    chunk.push(word);
  });

  if (chunk.length) {
    chunks.push(chunk);
  }

  return chunks.map((wordChunk, index) => {
    const firstWord = wordChunk[0];
    const lastWord = wordChunk[wordChunk.length - 1];

    return createLine({
      index,
      text: wordChunk.map((word) => word.word).join(" "),
      startMs: Math.max(0, firstWord.start * 1000 - 80),
      endMs: lastWord.end * 1000 + 120,
      visualDefaults,
      syncStatus: "matched",
      matchScore: 1,
      matchedWords: wordChunk,
    });
  });
}

function createLinesFromWhisperSegments(
  segments,
  words,
  visualDefaults = DEFAULT_VISUALS
) {
  const normalizedSegments = segments
    .map((segment) => ({
      text: cleanLineText(segment?.text),
      start: getSeconds(segment?.start),
      end: getSeconds(segment?.end),
    }))
    .filter((segment) => segment.text && segment.end >= segment.start);

  if (!normalizedSegments.length) {
    return [];
  }

  return normalizedSegments.map((segment, index) => {
    const matchedWords = words
      .map((word) => ({
        word: getWordText(word),
        start: getSeconds(word?.start),
        end: getSeconds(word?.end),
      }))
      .filter(
        (word) =>
          word.word &&
          word.start >= segment.start - 0.08 &&
          word.end <= segment.end + 0.12
      );

    return createLine({
      index,
      text: segment.text,
      startMs: Math.max(0, segment.start * 1000 - 80),
      endMs: segment.end * 1000 + 120,
      visualDefaults,
      syncStatus: "matched",
      matchScore: 1,
      matchedWords,
    });
  });
}

export function createLinesFromWhisper({
  text,
  words = [],
  segments = [],
  durationMs = 0,
  visualDefaults = DEFAULT_VISUALS,
}) {
  const wordLines = createLinesFromWhisperWords(
    Array.isArray(words) ? words : [],
    visualDefaults
  );

  if (wordLines.length) {
    return wordLines;
  }

  const segmentLines = createLinesFromWhisperSegments(
    Array.isArray(segments) ? segments : [],
    Array.isArray(words) ? words : [],
    visualDefaults
  );

  if (segmentLines.length) {
    return segmentLines;
  }

  return splitScriptIntoLines(text, durationMs, visualDefaults).map((line) => ({
    ...line,
    syncStatus: "fallback",
  }));
}
