import { DEFAULT_FONT_FAMILY } from "@/utils/fonts";
import { getLineMedia } from "@/utils/media";
import { DEFAULT_VISUALS } from "@/utils/script";
import { getActiveLine, getVisualLineForTime } from "@/utils/time";

const MEDIA_TRANSITION_MS = 1000;
const EXPORT_PRESETS = {
  reels: {
    width: 1080,
    height: 1920,
    fps: 30,
    captionScale: 1,
    captionMaxWidth: 0.85,
    videoBitsPerSecond: 9000000,
    filename: "the-return-reel",
  },
  youtube: {
    width: 1920,
    height: 1080,
    fps: 30,
    captionScale: 0.72,
    captionMaxWidth: 0.78,
    videoBitsPerSecond: 12000000,
    filename: "the-return-youtube",
  },
};

function getLineValue(line, field) {
  return line?.[field] ?? DEFAULT_VISUALS[field];
}

function clamp(value, min, max) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.min(Math.max(numeric, min), max);
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

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return (
    candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || ""
  );
}

export function getExportFormatSupport() {
  const mimeType = getSupportedMimeType();

  return {
    mimeType,
    extension: mimeType.includes("mp4") ? "mp4" : "webm",
    supportsMp4: mimeType.includes("mp4"),
  };
}

function waitForEvent(target, eventName, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}.`));
    }, timeoutMs);

    function cleanup() {
      window.clearTimeout(timeoutId);
      target.removeEventListener(eventName, handleSuccess);
      target.removeEventListener("error", handleError);
    }

    function handleSuccess() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error("Could not load media asset."));
    }

    target.addEventListener(eventName, handleSuccess, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}

async function loadImageAsset(src) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = src;

  if (image.complete && image.naturalWidth) {
    return image;
  }

  await waitForEvent(image, "load");

  if (image.decode) {
    try {
      await image.decode();
    } catch {
      // The image is already loaded; decode failures can be ignored here.
    }
  }

  return image;
}

async function loadVideoAsset(src) {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = src;
  await waitForEvent(video, "loadeddata");
  video.pause();

  try {
    video.currentTime = 0;
  } catch {
    // Some streaming video sources do not allow immediate seeking.
  }

  return video;
}

async function loadMediaAssets(lines, format, onStatus) {
  const assets = new Map();
  const mediaItems = Array.isArray(lines)
    ? lines
        .map((line) => getLineMedia(line, format))
        .filter((item) => item.media)
    : [];
  const uniqueItems = mediaItems.filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.media === item.media && candidate.mediaType === item.mediaType
      ) === index
  );

  for (const item of uniqueItems) {
    const key = `${item.mediaType}:${item.media}`;

    try {
      onStatus?.(`Loading ${item.media}`);
      const element =
        item.mediaType === "video"
          ? await loadVideoAsset(item.media)
          : await loadImageAsset(item.media);

      assets.set(key, {
        media: item.media,
        mediaType: item.mediaType,
        element,
        failed: false,
      });
    } catch {
      assets.set(key, {
        media: item.media,
        mediaType: item.mediaType,
        element: null,
        failed: true,
      });
    }
  }

  return assets;
}

function getMediaKey(line, format) {
  const resolved = getLineMedia(line, format);
  return `${resolved.mediaType}:${resolved.media}`;
}

function getPreviousLine(lines, line) {
  const sortedLines = [...lines].sort((a, b) => (a.startMs || 0) - (b.startMs || 0));
  const index = sortedLines.findIndex((item) => item.id === line?.id);

  if (index <= 0) {
    return null;
  }

  return sortedLines[index - 1];
}

function getMediaLayers(lines, visualLine, timeMs, format) {
  if (!visualLine) {
    return [];
  }

  const previousLine = getPreviousLine(lines, visualLine);
  const currentKey = getMediaKey(visualLine, format);
  const previousKey = previousLine ? getMediaKey(previousLine, format) : "";
  const elapsedMs = Number(timeMs) - Number(visualLine.startMs || 0);
  const shouldCrossfade =
    previousLine &&
    previousKey !== currentKey &&
    elapsedMs >= 0 &&
    elapsedMs < MEDIA_TRANSITION_MS;

  if (!shouldCrossfade) {
    return [
      {
        line: visualLine,
        opacityMultiplier: 1,
      },
    ];
  }

  const progress = clamp(elapsedMs / MEDIA_TRANSITION_MS, 0, 1);

  return [
    {
      line: previousLine,
      opacityMultiplier: 1 - progress,
    },
    {
      line: visualLine,
      opacityMultiplier: progress,
    },
  ];
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

  const mediaId = getMediaKey(sortedLines[currentIndex], format);
  let firstIndex = currentIndex;
  let lastIndex = currentIndex;

  while (firstIndex > 0 && getMediaKey(sortedLines[firstIndex - 1], format) === mediaId) {
    firstIndex -= 1;
  }

  while (
    lastIndex < sortedLines.length - 1 &&
    getMediaKey(sortedLines[lastIndex + 1], format) === mediaId
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

function getMotionValues(line, lines, format, timeMs) {
  const motion = getLineValue(line, "imageMotion");
  const zoomEnd = clamp(getLineValue(line, "imageZoom"), 1, 1.35);
  const zoomDelta = zoomEnd - 1;
  const motionWindow = getMediaMotionWindow(lines, line, format);
  const progress = clamp(
    ((Number(timeMs) || 0) - motionWindow.startMs) /
      Math.max(1, motionWindow.endMs - motionWindow.startMs),
    0,
    1
  );

  let scale = 1;
  let xPercent = 0;
  let yPercent = 0;

  if (motion === "zoom-in") {
    scale = 1 + zoomDelta * progress;
  } else if (motion === "zoom-out") {
    scale = zoomEnd - zoomDelta * progress;
  } else if (motion === "drift-up") {
    scale = 1 + zoomDelta * 0.82;
    yPercent = 2.2 - progress * 4.4;
  } else if (motion === "drift-left") {
    scale = 1 + zoomDelta * 0.82;
    xPercent = 2.2 - progress * 4.4;
  } else if (motion === "drift-right") {
    scale = 1 + zoomDelta * 0.82;
    xPercent = -2.2 + progress * 4.4;
  }

  return { scale, xPercent, yPercent };
}

function getCanvasFilter(line) {
  const blur = clamp(getLineValue(line, "imageBlur"), 0, 12);
  const brightness = clamp(getLineValue(line, "imageBrightness"), 0.35, 1.75);
  const contrast = clamp(getLineValue(line, "imageContrast"), 0.5, 2);
  const saturation = clamp(getLineValue(line, "imageSaturation"), 0, 2.5);

  return `blur(${blur}px) brightness(${brightness}) contrast(${contrast}) saturate(${saturation})`;
}

function drawCoverMedia(ctx, element, line, lines, format, timeMs, opacityMultiplier) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const mediaWidth = element.videoWidth || element.naturalWidth || element.width;
  const mediaHeight = element.videoHeight || element.naturalHeight || element.height;

  if (!mediaWidth || !mediaHeight) {
    return;
  }

  const coverScale = Math.max(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
  const baseWidth = mediaWidth * coverScale;
  const baseHeight = mediaHeight * coverScale;
  const motion = getMotionValues(line, lines, format, timeMs);
  const drawWidth = baseWidth * motion.scale;
  const drawHeight = baseHeight * motion.scale;
  const drawX =
    (canvasWidth - drawWidth) / 2 + (canvasWidth * motion.xPercent) / 100;
  const drawY =
    (canvasHeight - drawHeight) / 2 + (canvasHeight * motion.yPercent) / 100;

  ctx.save();
  ctx.globalAlpha = clamp(getLineValue(line, "imageOpacity"), 0, 1) * opacityMultiplier;
  ctx.filter = getCanvasFilter(line);
  ctx.drawImage(element, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawVignette(ctx, line) {
  const opacity = clamp(getLineValue(line, "vignetteOpacity"), 0, 1);

  if (opacity <= 0) {
    return;
  }

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const radius = Math.max(width, height) * 0.68;
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.24,
    width / 2,
    height / 2,
    radius
  );

  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawOverlay(ctx, line) {
  const opacity = clamp(getLineValue(line, "overlayOpacity"), 0, 1);

  if (opacity <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

function getWordRevealText(line, currentTimeMs) {
  const text = String(line?.text || "");

  if (!line || !text) {
    return "";
  }

  if (getLineValue(line, "captionReveal") === "instant") {
    return text;
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

  return words.slice(0, visibleWordCount).join("").trimEnd();
}

function getTextShadowConfig(line) {
  const mode = getLineValue(line, "textShadowMode");
  const color = getLineValue(line, "textShadowColor");

  if (mode === "none") {
    return { color: "rgba(0,0,0,0)", blur: 0, offsetX: 0, offsetY: 0 };
  }

  if (mode === "soft") {
    return { color: rgba(color, 0.62), blur: 8, offsetX: 0, offsetY: 2 };
  }

  if (mode === "glow") {
    return { color: rgba(color, 0.82), blur: 18, offsetX: 0, offsetY: 0 };
  }

  return { color: rgba(color, 0.82), blur: 18, offsetX: 0, offsetY: 4 };
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (ctx.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawCaption(ctx, line, timeMs, preset) {
  const text = getWordRevealText(line, timeMs);

  if (!text) {
    return;
  }

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const fontSize = Math.round(getLineValue(line, "textSize") * preset.captionScale);
  const fontFamily = getLineValue(line, "fontFamily") || DEFAULT_FONT_FAMILY;
  const maxTextWidth = width * preset.captionMaxWidth;
  const lineHeight = fontSize * 0.92;
  const position = getLineValue(line, "textPosition");
  const shadow = getTextShadowConfig(line);
  const strokeWidth = clamp(getLineValue(line, "textStrokeWidth"), 0, 8) * 2;
  const wrappedLines = wrapText(ctx, text, maxTextWidth);
  const totalHeight = Math.max(1, wrappedLines.length) * lineHeight;

  let centerY = height / 2;

  if (position === "top") {
    centerY = height * 0.12 + totalHeight / 2;
  } else if (position === "bottom") {
    centerY = height * 0.88 - totalHeight / 2;
  }

  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  ctx.save();
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.fillStyle = getLineValue(line, "textColor");
  ctx.strokeStyle = getLineValue(line, "textStrokeColor");
  ctx.lineWidth = strokeWidth;
  ctx.shadowColor = shadow.color;
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX;
  ctx.shadowOffsetY = shadow.offsetY;

  wrappedLines.forEach((captionLine, index) => {
    const y = startY + index * lineHeight;

    if (strokeWidth > 0) {
      ctx.strokeText(captionLine, width / 2, y);
    }

    ctx.fillText(captionLine, width / 2, y);
  });

  ctx.restore();
}

function renderFrame(ctx, lines, format, timeMs, mediaAssets) {
  const visualLine = getVisualLineForTime(lines, timeMs);
  const activeLine = getActiveLine(lines, timeMs);

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

  if (!visualLine) {
    return;
  }

  const mediaLayers = getMediaLayers(lines, visualLine, timeMs, format);

  mediaLayers.forEach((layer) => {
    const media = getLineMedia(layer.line, format);
    const asset = mediaAssets.get(`${media.mediaType}:${media.media}`);

    if (!asset?.element) {
      return;
    }

    drawCoverMedia(
      ctx,
      asset.element,
      layer.line,
      lines,
      format,
      timeMs,
      layer.opacityMultiplier
    );
  });

  drawVignette(ctx, visualLine);
  drawOverlay(ctx, visualLine);

  if (activeLine) {
    drawCaption(ctx, activeLine, timeMs, EXPORT_PRESETS[format]);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 12000);
}

async function decodeAudioUrl(audioContext, audioUrl, errorMessage) {
  const response = await fetch(audioUrl);

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const audioData = await response.arrayBuffer();
  return audioContext.decodeAudioData(audioData.slice(0));
}

async function prepareAudioStream({
  audioUrl,
  backgroundMusicUrl,
  backgroundMusicVolumePct,
}) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("This browser cannot mix audio for export.");
  }

  const audioContext = new AudioContextClass();
  await audioContext.resume();
  const voiceBuffer = await decodeAudioUrl(
    audioContext,
    audioUrl,
    "Could not read uploaded voiceover for export."
  );
  const musicVolume = clamp((Number(backgroundMusicVolumePct) || 0) / 100, 0, 1);
  const musicBuffer =
    backgroundMusicUrl && musicVolume > 0
      ? await decodeAudioUrl(
          audioContext,
          backgroundMusicUrl,
          "Could not read background music for export."
        )
      : null;
  const destination = audioContext.createMediaStreamDestination();
  const voiceSource = audioContext.createBufferSource();
  const voiceGain = audioContext.createGain();
  const sources = [voiceSource];

  voiceSource.buffer = voiceBuffer;
  voiceGain.gain.value = 1;
  voiceSource.connect(voiceGain);
  voiceGain.connect(destination);

  if (musicBuffer) {
    const musicSource = audioContext.createBufferSource();
    const musicGain = audioContext.createGain();

    musicSource.buffer = musicBuffer;
    musicSource.loop = true;
    musicGain.gain.value = musicVolume;
    musicSource.connect(musicGain);
    musicGain.connect(destination);
    sources.push(musicSource);
  }

  return {
    audioContext,
    source: voiceSource,
    audioStream: destination.stream,
    durationMs: Math.round(voiceBuffer.duration * 1000),
    start: () => {
      sources.forEach((source) => source.start(0));
    },
    stop: () => {
      sources.forEach((source) => {
        try {
          source.stop(0);
        } catch {
          // Source may already have ended.
        }
      });
    },
  };
}

export async function exportRenderedVideo({
  lines,
  audioUrl,
  backgroundMusicUrl,
  backgroundMusicVolumePct,
  durationMs,
  format,
  onProgress,
  onStatus,
}) {
  if (!Array.isArray(lines) || !lines.length) {
    throw new Error("Create or transcribe lines before exporting.");
  }

  if (!audioUrl) {
    throw new Error("Upload an audio file before exporting.");
  }

  if (!window.MediaRecorder) {
    throw new Error("This browser does not support MediaRecorder export.");
  }

  const preset = EXPORT_PRESETS[format] || EXPORT_PRESETS.reels;
  const support = getExportFormatSupport();
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx || !canvas.captureStream) {
    throw new Error("This browser cannot capture a canvas render.");
  }

  onStatus?.("Preparing audio");
  const audioSetup = await prepareAudioStream({
    audioUrl,
    backgroundMusicUrl,
    backgroundMusicVolumePct,
  });
  onStatus?.("Preparing media");
  const mediaAssets = await loadMediaAssets(lines, format, onStatus);
  const exportDurationMs = Math.max(
    1000,
    Math.min(
      Number(durationMs) || audioSetup.durationMs || 1000,
      audioSetup.durationMs || Number(durationMs) || 1000
    )
  );

  const canvasStream = canvas.captureStream(preset.fps);
  const stream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioSetup.audioStream.getAudioTracks(),
  ]);
  const recorderOptions = {
    videoBitsPerSecond: preset.videoBitsPerSecond,
    audioBitsPerSecond: 192000,
  };

  if (support.mimeType) {
    recorderOptions.mimeType = support.mimeType;
  }

  const recorder = new MediaRecorder(stream, recorderOptions);
  const chunks = [];
  let animationFrameId = 0;
  let stopTimerId = 0;
  let stopped = false;
  let started = false;
  let startTime = 0;

  function cleanup() {
    window.cancelAnimationFrame(animationFrameId);
    window.clearTimeout(stopTimerId);
    if (started) {
      audioSetup.stop();
    }
    audioSetup.audioContext.close?.();
    stream.getTracks().forEach((track) => track.stop());
    mediaAssets.forEach((asset) => {
      if (asset.mediaType === "video" && asset.element) {
        asset.element.pause();
        asset.element.src = "";
        asset.element.load();
      }
    });
  }

  function stopRecorder() {
    if (stopped) {
      return;
    }

    stopped = true;

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  recorder.ondataavailable = (event) => {
    if (event.data?.size) {
      chunks.push(event.data);
    }
  };

  const finished = new Promise((resolve, reject) => {
    recorder.onerror = () => {
      cleanup();
      reject(new Error("Video recording failed."));
    };

    recorder.onstop = () => {
      try {
        cleanup();
        const type = recorder.mimeType || support.mimeType || "video/webm";
        const extension = type.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunks, { type });
        const filename = `${preset.filename}.${extension}`;
        downloadBlob(blob, filename);
        resolve({
          blob,
          filename,
          mimeType: type,
          extension,
          supportsMp4: extension === "mp4",
        });
      } catch (error) {
        reject(error);
      }
    };
  });

  function drawLoop() {
    const timeMs = Math.min(
      exportDurationMs,
      Math.round(window.performance.now() - startTime)
    );

    renderFrame(ctx, lines, format, timeMs, mediaAssets);
    onProgress?.(timeMs / exportDurationMs);

    if (!stopped && timeMs >= exportDurationMs - 40) {
      stopRecorder();
      return;
    }

    if (!stopped) {
      animationFrameId = window.requestAnimationFrame(drawLoop);
    }
  }

  onStatus?.("Recording");
  renderFrame(ctx, lines, format, 0, mediaAssets);
  recorder.start(500);
  mediaAssets.forEach((asset) => {
    if (asset.mediaType === "video" && asset.element) {
      try {
        asset.element.currentTime = 0;
      } catch {
        // Some streaming video sources do not allow immediate seeking.
      }
      asset.element.play().catch(() => {});
    }
  });
  startTime = window.performance.now();
  started = true;
  audioSetup.start();
  audioSetup.source.onended = stopRecorder;
  animationFrameId = window.requestAnimationFrame(drawLoop);
  stopTimerId = window.setTimeout(stopRecorder, exportDurationMs + 750);

  return finished;
}
