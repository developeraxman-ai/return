"use client";

import { useMemo, useState } from "react";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import {
  applyGeneratedSceneMedia,
  parseAiImagePlan,
} from "@/utils/aiImagePlan";
import { msToTime } from "@/utils/time";

const DEFAULT_NEGATIVE_PROMPT =
  "readable text, subtitles, captions, logos, watermark, brand names, distorted hands, extra fingers, blurry subject, low quality, cartoon, anime, overexposed, cluttered center";

function getLineRangeLabel(scene, lines) {
  const startLine = scene.startIndex + 1;
  const endLine = scene.endIndex + 1;
  const startTime = lines[scene.startIndex]?.startMs ?? 0;

  return `Lines ${startLine}-${endLine} at ${msToTime(scene.transitionMs ?? startTime)}`;
}

export default function AiImageGeneratorPanel({ lines, setLines }) {
  const [planText, setPlanText] = useState("");
  const [generatedMediaBySceneKey, setGeneratedMediaBySceneKey] = useState({});
  const [generatingKey, setGeneratingKey] = useState("");
  const [message, setMessage] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("medium");
  const parsedPlan = useMemo(
    () => parseAiImagePlan(planText, lines),
    [planText, lines]
  );
  const canGenerate = Boolean(parsedPlan.scenes.length && lines.length);

  function applyGeneratedMedia(nextGeneratedMedia) {
    setLines((currentLines) =>
      applyGeneratedSceneMedia(currentLines, parsedPlan.scenes, nextGeneratedMedia)
    );
  }

  async function generateScene(scene) {
    if (!scene?.imagePrompt) {
      return;
    }

    setGeneratingKey(scene.key);
    setMessage(`Generating scene ${scene.sceneNumber}...`);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: scene.imagePrompt,
          negativePrompt: scene.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
          sceneNumber: scene.sceneNumber,
          size,
          quality,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Image generation failed.");
      }

      const nextGeneratedMedia = {
        ...generatedMediaBySceneKey,
        [scene.key]: payload.file.path,
      };

      setGeneratedMediaBySceneKey(nextGeneratedMedia);
      applyGeneratedMedia(nextGeneratedMedia);
      setMessage(`Generated and assigned ${payload.file.path}`);

      return payload.file.path;
    } catch (error) {
      setMessage(error?.message || "Image generation failed.");
      return "";
    } finally {
      setGeneratingKey("");
    }
  }

  async function generateAllScenes() {
    if (!canGenerate) {
      setMessage("Paste valid scene JSON after transcription.");
      return;
    }

    let nextGeneratedMedia = { ...generatedMediaBySceneKey };

    for (const scene of parsedPlan.scenes) {
      setGeneratingKey(scene.key);
      setMessage(`Generating scene ${scene.sceneNumber}...`);

      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: scene.imagePrompt,
            negativePrompt: scene.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
            sceneNumber: scene.sceneNumber,
            size,
            quality,
          }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          throw new Error(payload.error || `Scene ${scene.sceneNumber} failed.`);
        }

        nextGeneratedMedia = {
          ...nextGeneratedMedia,
          [scene.key]: payload.file.path,
        };
        setGeneratedMediaBySceneKey(nextGeneratedMedia);
        applyGeneratedMedia(nextGeneratedMedia);
      } catch (error) {
        setMessage(error?.message || `Scene ${scene.sceneNumber} failed.`);
        setGeneratingKey("");
        return;
      }
    }

    setGeneratingKey("");
    setMessage(`Generated and assigned ${parsedPlan.scenes.length} scenes.`);
  }

  function applyExistingGenerated() {
    if (!Object.keys(generatedMediaBySceneKey).length) {
      setMessage("Generate at least one image first.");
      return;
    }

    applyGeneratedMedia(generatedMediaBySceneKey);
    setMessage("Applied generated images to the timeline.");
  }

  return (
    <CollapsiblePanel
      title="AI Image Generator"
      subtitle={
        parsedPlan.scenes.length
          ? `${parsedPlan.scenes.length} scenes parsed. Generated images save to public/media.`
          : "Paste ChatGPT scene JSON, then generate and assign images."
      }
      rightContent={
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
            canGenerate
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
              : "border-white/10 bg-black/25 text-slate-500"
          }`}
        >
          {canGenerate ? "Ready" : "Paste JSON"}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_130px_110px]">
        <div>
          <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Scene JSON
          </label>
          <textarea
            value={planText}
            onChange={(event) => {
              setPlanText(event.target.value);
              setGeneratedMediaBySceneKey({});
              setMessage("");
            }}
            rows={8}
            className="mt-1 w-full resize-y rounded-md border border-white/10 bg-black/35 p-3 text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
            placeholder='Paste ChatGPT JSON here: { "scenes": [{ "sceneNumber": 1, "appliesToLines": "1-4", "transitionAt": "0:00.0", "imagePrompt": "..." }] }'
          />
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Size
          </label>
          <select
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
          >
            <option value="1024x1024">Square</option>
            <option value="1024x1536">Portrait</option>
            <option value="1536x1024">Landscape</option>
          </select>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Square is safest for both Reels and YouTube crops.
          </p>
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Quality
          </label>
          <select
            value={quality}
            onChange={(event) => setQuality(event.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canGenerate || Boolean(generatingKey)}
          onClick={generateAllScenes}
          className="rounded-md bg-cyan-300 px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {generatingKey ? "Generating..." : "Generate All Scenes"}
        </button>
        <button
          type="button"
          disabled={!Object.keys(generatedMediaBySceneKey).length || Boolean(generatingKey)}
          onClick={applyExistingGenerated}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Apply Generated
        </button>
      </div>

      {parsedPlan.error ? (
        <p className="mt-3 text-xs text-amber-200">{parsedPlan.error}</p>
      ) : null}
      {message ? <p className="mt-3 text-xs text-slate-400">{message}</p> : null}

      <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
        {!parsedPlan.scenes.length ? (
          <p className="rounded-md border border-white/10 bg-black/25 p-3 text-xs text-slate-500">
            No scene prompts parsed yet.
          </p>
        ) : (
          parsedPlan.scenes.map((scene) => {
            const generatedPath = generatedMediaBySceneKey[scene.key];

            return (
              <article
                key={scene.key}
                className="rounded-md border border-white/10 bg-black/25 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white">
                      Scene {scene.sceneNumber}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getLineRangeLabel(scene, lines)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(generatingKey)}
                    onClick={() => generateScene(scene)}
                    className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
                  >
                    {generatingKey === scene.key ? "Generating" : "Generate"}
                  </button>
                </div>

                {scene.emotion || scene.visualTheme ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {[scene.emotion, scene.visualTheme].filter(Boolean).join(" / ")}
                  </p>
                ) : null}

                <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-300">
                  {scene.imagePrompt}
                </p>

                {generatedPath ? (
                  <div className="mt-3 flex items-center gap-3 rounded-md border border-emerald-300/20 bg-emerald-300/10 p-2">
                    <img
                      src={generatedPath}
                      alt=""
                      className="h-14 w-14 rounded border border-white/10 object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-100">
                      {generatedPath}
                    </span>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </CollapsiblePanel>
  );
}
