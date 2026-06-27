import { setLineMediaForFormat } from "@/utils/media";

function extractJson(text) {
  const raw = String(text || "").trim();

  if (!raw) {
    return "";
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
}

function parseJsonPayload(text) {
  const jsonText = extractJson(text);
  return JSON.parse(jsonText);
}

function stringifyContextValue(value) {
  if (value == null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.length ? JSON.stringify(value, null, 2) : "";
  }

  if (typeof value === "object") {
    return Object.keys(value).length ? JSON.stringify(value, null, 2) : "";
  }

  return String(value || "").trim();
}

function getContextValue(payload, keys) {
  for (const key of keys) {
    const value = stringifyContextValue(payload?.[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function buildGlobalContext(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return "";
  }

  const fields = [
    { label: "Overall theme", keys: ["overallTheme", "theme"] },
    { label: "Emotional arc", keys: ["emotionalArc", "arc"] },
    { label: "Visual rules", keys: ["visualRules", "rules"] },
    {
      label: "Continuity guide",
      keys: ["continuityGuide", "continuity", "sceneContext", "globalContext"],
    },
    {
      label: "Recurring characters",
      keys: ["recurringCharacters", "characters", "characterBible"],
    },
    {
      label: "Recurring locations",
      keys: ["recurringLocations", "locations", "locationBible"],
    },
    {
      label: "Recurring visual anchors",
      keys: ["recurringVisualAnchors", "visualAnchors", "props"],
    },
    { label: "Style guide", keys: ["styleGuide", "style", "cinematicStyle"] },
  ];

  return fields
    .map(({ label, keys }) => {
      const value = getContextValue(payload, keys);
      return value ? `${label}:\n${value}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function buildSceneGenerationPrompt(scene, globalContext = "") {
  const imagePrompt = String(scene?.imagePrompt || scene?.prompt || "").trim();
  const context = String(globalContext || "").trim();
  const sceneContinuity = String(
    scene?.continuityNotes ||
      scene?.characterContinuity ||
      scene?.visualContinuity ||
      ""
  ).trim();

  if (!context && !sceneContinuity) {
    return imagePrompt;
  }

  return [
    context ? "Continuity context for the full video:" : "",
    context,
    context
      ? "Apply this continuity exactly. Each image is generated independently, so recurring characters, props, wardrobe, location logic, lens, lighting, and color grade must match the context instead of being redesigned."
      : "",
    sceneContinuity ? "Scene-specific continuity notes:" : "",
    sceneContinuity,
    `Scene ${Number(scene?.sceneNumber) || 1} image prompt:`,
    imagePrompt,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseLineRange(value, lineCount) {
  const text = String(value || "");
  const rangeMatch = text.match(/(\d+)\s*(?:-|–|—|to|through)\s*(\d+)/i);

  if (rangeMatch) {
    const start = Math.max(1, Number(rangeMatch[1]));
    const end = Math.max(start, Number(rangeMatch[2]));

    return {
      startIndex: Math.min(start - 1, Math.max(0, lineCount - 1)),
      endIndex: Math.min(end - 1, Math.max(0, lineCount - 1)),
      explicit: true,
    };
  }

  const numbers = [...text.matchAll(/\d+/g)]
    .map((match) => Number(match[0]))
    .filter((number) => Number.isFinite(number) && number > 0);

  if (!numbers.length) {
    return null;
  }

  return {
    startIndex: Math.min(Math.min(...numbers) - 1, Math.max(0, lineCount - 1)),
    endIndex: Math.min(Math.max(...numbers) - 1, Math.max(0, lineCount - 1)),
    explicit: true,
  };
}

function parseTransitionMs(value) {
  const text = String(value || "").trim().toLowerCase();

  if (!text) {
    return null;
  }

  const msMatch = text.match(/(\d+(?:\.\d+)?)\s*ms/);
  if (msMatch) {
    return Math.round(Number(msMatch[1]));
  }

  const timeMatch = text.match(/(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}(?:\.\d+)?))?/);
  if (timeMatch && text.includes(":")) {
    const parts = text
      .match(/\d+(?:\.\d+)?/g)
      ?.map((part) => Number(part)) || [];

    if (parts.length === 3) {
      return Math.round(((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000);
    }

    if (parts.length === 2) {
      return Math.round((parts[0] * 60 + parts[1]) * 1000);
    }
  }

  const secondsMatch = text.match(/(\d+(?:\.\d+)?)\s*s(?:ec|econds?)?/);
  if (secondsMatch) {
    return Math.round(Number(secondsMatch[1]) * 1000);
  }

  const numberMatch = text.match(/\d+(?:\.\d+)?/);
  if (numberMatch) {
    return Math.round(Number(numberMatch[0]) * 1000);
  }

  return null;
}

function findLineIndexAtTime(lines, timeMs) {
  if (!Array.isArray(lines) || !lines.length || timeMs == null) {
    return null;
  }

  const index = lines.findIndex(
    (line) => timeMs >= Number(line.startMs || 0) && timeMs < Number(line.endMs || 0)
  );

  if (index !== -1) {
    return index;
  }

  const nextIndex = lines.findIndex((line) => Number(line.startMs || 0) >= timeMs);
  return nextIndex === -1 ? lines.length - 1 : nextIndex;
}

function normalizeScene(scene, index, lines) {
  const imagePrompt = String(scene?.imagePrompt || scene?.prompt || "").trim();
  const sceneNumber = Number(scene?.sceneNumber) || index + 1;
  const lineRange = parseLineRange(scene?.appliesToLines, lines.length);
  const transitionMs = parseTransitionMs(scene?.transitionAt);
  const transitionLineIndex = findLineIndexAtTime(lines, transitionMs);

  return {
    key: `scene-${sceneNumber}-${index}`,
    sceneNumber,
    appliesToLines: String(scene?.appliesToLines || "").trim(),
    transitionAt: String(scene?.transitionAt || "").trim(),
    emotion: String(scene?.emotion || "").trim(),
    visualTheme: String(scene?.visualTheme || "").trim(),
    imagePrompt,
    negativePrompt: String(scene?.negativePrompt || "").trim(),
    continuityNotes: String(
      scene?.continuityNotes ||
        scene?.characterContinuity ||
        scene?.visualContinuity ||
        ""
    ).trim(),
    reason: String(scene?.reason || "").trim(),
    transitionMs,
    explicitRange: lineRange,
    startIndex: lineRange?.startIndex ?? transitionLineIndex ?? index,
    endIndex: lineRange?.endIndex ?? null,
  };
}

export function parseAiImagePlan(planText, lines) {
  if (!String(planText || "").trim()) {
    return {
      scenes: [],
      globalContext: "",
      error: "",
    };
  }

  try {
    const payload = parseJsonPayload(planText);
    const rawScenes = Array.isArray(payload) ? payload : payload?.scenes;
    const globalContext = buildGlobalContext(payload);

    if (!Array.isArray(rawScenes) || !rawScenes.length) {
      return {
        scenes: [],
        globalContext,
        error: "JSON must contain a scenes array.",
      };
    }

    const scenes = rawScenes
      .map((scene, index) => normalizeScene(scene, index, lines))
      .filter((scene) => scene.imagePrompt);

    if (!scenes.length) {
      return {
        scenes: [],
        globalContext,
        error: "No scenes with imagePrompt were found.",
      };
    }

    const sortedScenes = scenes
      .map((scene) => ({
        ...scene,
        startIndex: Math.max(0, Math.min(scene.startIndex, Math.max(0, lines.length - 1))),
      }))
      .sort((a, b) => a.startIndex - b.startIndex || a.sceneNumber - b.sceneNumber);

    return {
      scenes: sortedScenes.map((scene, index) => {
        const nextScene = sortedScenes[index + 1];
        const fallbackEndIndex = nextScene
          ? Math.max(scene.startIndex, nextScene.startIndex - 1)
          : Math.max(0, lines.length - 1);

        return {
          ...scene,
          endIndex:
            scene.endIndex == null
              ? fallbackEndIndex
              : Math.max(scene.startIndex, scene.endIndex),
          generationPrompt: buildSceneGenerationPrompt(scene, globalContext),
        };
      }),
      globalContext,
      error: "",
    };
  } catch (error) {
    return {
      scenes: [],
      globalContext: "",
      error: error?.message || "Could not parse scene JSON.",
    };
  }
}

export function applyGeneratedSceneMedia(lines, scenes, generatedMediaBySceneKey) {
  if (!Array.isArray(lines) || !Array.isArray(scenes)) {
    return lines;
  }

  return lines.map((line, index) => {
    const scene = scenes.find(
      (candidate) =>
        generatedMediaBySceneKey[candidate.key] &&
        index >= candidate.startIndex &&
        index <= candidate.endIndex
    );

    if (!scene) {
      return line;
    }

    const mediaPatch = {
      media: generatedMediaBySceneKey[scene.key],
      mediaType: "image",
    };
    const reelsLine = setLineMediaForFormat(line, "reels", mediaPatch);
    return setLineMediaForFormat(reelsLine, "youtube", mediaPatch);
  });
}
