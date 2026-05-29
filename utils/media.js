export const VIDEO_FORMATS = ["reels", "youtube"];

export function getFormatLabel(format) {
  return format === "youtube" ? "YouTube" : "Reels";
}

export function getLineMedia(line, format = "reels") {
  const media = line?.media;
  const mediaType = line?.mediaType;
  const fallbackFormat = format === "youtube" ? "reels" : "youtube";

  const resolvedMedia =
    media && typeof media === "object"
      ? media[format] || media[fallbackFormat] || ""
      : media || "";
  const resolvedMediaType =
    mediaType && typeof mediaType === "object"
      ? mediaType[format] || mediaType[fallbackFormat] || "image"
      : mediaType || "image";

  return {
    media: resolvedMedia,
    mediaType: resolvedMediaType,
  };
}

export function setLineMediaForFormat(line, format, mediaPatch) {
  const currentReels = getLineMedia(line, "reels");
  const currentYoutube = getLineMedia(line, "youtube");

  const nextMedia = {
    reels: currentReels.media,
    youtube: currentYoutube.media,
  };
  const nextMediaType = {
    reels: currentReels.mediaType,
    youtube: currentYoutube.mediaType,
  };

  if (Object.prototype.hasOwnProperty.call(mediaPatch, "media")) {
    nextMedia[format] = mediaPatch.media;
  }

  if (Object.prototype.hasOwnProperty.call(mediaPatch, "mediaType")) {
    nextMediaType[format] = mediaPatch.mediaType;
  }

  return {
    ...line,
    media: nextMedia,
    mediaType: nextMediaType,
  };
}

export function lineUsesMediaForFormat(line, format, media, mediaType) {
  const resolved = getLineMedia(line, format);
  return resolved.media === media && resolved.mediaType === mediaType;
}

export function getMediaSummary(line) {
  const reels = getLineMedia(line, "reels");
  const youtube = getLineMedia(line, "youtube");

  if (
    reels.media === youtube.media &&
    reels.mediaType === youtube.mediaType
  ) {
    return reels.media || "No media";
  }

  return `R: ${reels.media || "-"} / Y: ${youtube.media || "-"}`;
}
