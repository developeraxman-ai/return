import { getLineMedia } from "@/utils/media";
import { msToTime } from "@/utils/time";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatTimedLines(lines) {
  if (!Array.isArray(lines) || !lines.length) {
    return "No timed lines yet.";
  }

  return lines
    .map((line, index) => {
      const lineNumber = String(index + 1).padStart(2, "0");
      return `${lineNumber}. [${msToTime(line.startMs)} - ${msToTime(line.endMs)}] ${cleanText(line.text)}`;
    })
    .join("\n");
}

function getTranscriptFallback(transcriptText, lines) {
  const transcript = cleanText(transcriptText);

  if (transcript) {
    return transcript;
  }

  return Array.isArray(lines)
    ? lines.map((line) => cleanText(line.text)).filter(Boolean).join(" ")
    : "";
}

export function buildImagePromptBrief({
  transcriptText,
  lines,
  durationMs,
  themeNotes = "",
}) {
  const transcript = getTranscriptFallback(transcriptText, lines);
  const timedLines = formatTimedLines(lines);
  const safeThemeNotes =
    cleanText(themeNotes) ||
    "[WRITE YOUR EMOTION/THEME/CONTINUITY HERE. Example: shame turning into discipline, dark comedy, self-confrontation, Bangalore night, lonely room, gym comeback, road at dawn. Recurring mother: same woman in every scene she appears.]";

  return `I am making a faceless motivational short/video in THE RETURN Editor.

I will paste timed caption lines from my app. Your job is to decide the emotional arc, visual theme, and image prompts.

Do not create one image per line unless needed. Group consecutive lines into visual scenes. Each scene should cover multiple caption lines when the emotion/context is the same.

My intended emotion/theme/continuity notes:
${safeThemeNotes}

Return JSON only.

Rules:
- Make everything faceless.
- No readable text inside images.
- No logos, captions, subtitles, watermarks, brand names, UI, celebrities, copyrighted characters, or identifiable real people.
- Use realistic cinematic imagery.
- Keep center area clean because big captions will appear there.
- Images must crop well for both 9:16 reels and 16:9 YouTube.
- Prefer strong simple visuals over busy scenes.
- Use 5 to 8 scenes for a 30-60 second video.
- Use the same image across consecutive lines when it improves flow.
- If a line is abstract, convert it into a concrete visual metaphor.
- Indian/Bangalore context is allowed only if it naturally fits.
- Build a continuity guide before the scene list.
- Treat every image as independently generated. That means each imagePrompt must repeat the exact stable descriptor for every recurring character, object, and location that appears in that scene.
- Use explicit recurring tags like MOTHER_A, SON_A, ROOM_A, TEMPLE_STREET_A, etc. Reuse the same tag and the same descriptor every time that subject returns.
- If MOTHER_A appears in scene 1 and scene 6, scene 6 must describe the same MOTHER_A again with the same age range, build, hair, wardrobe palette, posture, face visibility, and emotional presence.
- Keep the same cinematic style, lens language, color grade, lighting logic, and crop safety across all scenes unless there is a clear story reason to change.

At the top level, provide:
- overallTheme
- emotionalArc
- visualRules
- continuityGuide
- recurringCharacters
- recurringLocations
- styleGuide

For each scene, provide:
- sceneNumber
- appliesToLines
- transitionAt
- emotion
- visualTheme
- imagePrompt
- negativePrompt
- reason

The imagePrompt must be directly usable in an AI image generator and must include the relevant recurring tags and full descriptors from the continuity guide.

Output JSON only in this shape:

{
  "overallTheme": "",
  "emotionalArc": "",
  "visualRules": "",
  "continuityGuide": "",
  "recurringCharacters": [
    {
      "tag": "MOTHER_A",
      "role": "",
      "stableDescriptor": "",
      "mustStaySame": ""
    }
  ],
  "recurringLocations": [
    {
      "tag": "ROOM_A",
      "stableDescriptor": "",
      "mustStaySame": ""
    }
  ],
  "styleGuide": "",
  "scenes": [
    {
      "sceneNumber": 1,
      "appliesToLines": "",
      "transitionAt": "",
      "emotion": "",
      "visualTheme": "",
      "imagePrompt": "",
      "negativePrompt": "readable text, subtitles, captions, logos, watermark, brand names, distorted hands, extra fingers, blurry subject, low quality, cartoon, anime, overexposed, cluttered center",
      "reason": ""
    }
  ]
}

Video duration:
${msToTime(durationMs)}

Here is my transcript/script:
${transcript || "No transcript text available."}

Here are the timed caption lines:
${timedLines}`;
}

export function buildTimedLinesExport({ transcriptText, lines, durationMs }) {
  return {
    app: "THE RETURN Editor",
    exportType: "timed-lines-for-image-prompts",
    exportedAt: new Date().toISOString(),
    durationMs: Math.max(0, Math.round(Number(durationMs) || 0)),
    transcriptText: transcriptText || "",
    lines: Array.isArray(lines)
      ? lines.map((line, index) => {
          const reelsMedia = getLineMedia(line, "reels");
          const youtubeMedia = getLineMedia(line, "youtube");

          return {
            index: index + 1,
            id: line.id,
            text: line.text || "",
            startMs: Math.round(Number(line.startMs) || 0),
            endMs: Math.round(Number(line.endMs) || 0),
            startTime: msToTime(line.startMs),
            endTime: msToTime(line.endMs),
            syncStatus: line.syncStatus || "manual",
            matchScore: line.matchScore ?? null,
            matchedWordsCount: line.matchedWords?.length || 0,
            reelsMedia,
            youtubeMedia,
          };
        })
      : [],
  };
}
