"use client";

import { useState } from "react";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import { alignScriptLinesToWhisperWords } from "@/utils/align";
import { splitScriptIntoLines } from "@/utils/script";

const SAMPLE_SCRIPT_TEXT = [
  "Bro...",
  "You don't even fail creatively.",
  "That is the most insulting part.",
  "You fail in the exact same boring way.",
  "Again and again and again.",
  "You make a plan at night like some changed man only.",
  "Full confidence.",
  "Then morning comes.",
  "Alarm rings.",
  "And the hero from last night becomes advocate.",
  "Bro, shut up.",
  "Respectfully.",
  "Shut up.",
].join("\n");

export default function ScriptImporter({
  lines,
  setLines,
  durationMs,
  whisperWords,
  transcriptText,
  setSelectedLineId,
  videoSettings,
}) {
  const [scriptText, setScriptText] = useState("");
  const [message, setMessage] = useState("");
  const hasScriptText = Boolean(scriptText.trim());
  const canAutoSync = Boolean(
    whisperWords.length && (lines.length || hasScriptText)
  );
  const autoSyncDisabledReason = !whisperWords.length
    ? "Transcribe audio first so Whisper word timestamps are available."
    : !lines.length && !hasScriptText
      ? "Paste script text or use the Whisper transcript, then sync."
      : "";

  function transcriptToLines(text) {
    const sentences = String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (sentences.length) {
      return sentences.join("\n");
    }

    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const linesFromWords = [];

    for (let index = 0; index < words.length; index += 8) {
      linesFromWords.push(words.slice(index, index + 8).join(" "));
    }

    return linesFromWords.join("\n");
  }

  function handleCreateLines() {
    const nextLines = splitScriptIntoLines(scriptText, durationMs, videoSettings);
    setLines(nextLines);
    setSelectedLineId(nextLines[0]?.id || null);
    setMessage(`Created ${nextLines.length} lines.`);
  }

  function handleLoadSampleScript() {
    setScriptText(SAMPLE_SCRIPT_TEXT);
    setMessage("Loaded sample script text. Click Create Lines to use it.");
  }

  function handleUseTranscript() {
    const nextScriptText = transcriptToLines(transcriptText);
    setScriptText(nextScriptText);
    setMessage("Loaded Whisper transcript into the script box.");
  }

  function handleAutoSync() {
    let sourceLines = lines;

    if (!sourceLines.length && hasScriptText) {
      sourceLines = splitScriptIntoLines(scriptText, durationMs, videoSettings);
    }

    if (!sourceLines.length) {
      setMessage("Paste script text or use the Whisper transcript before syncing.");
      return;
    }

    const syncedLines = alignScriptLinesToWhisperWords(sourceLines, whisperWords);
    setLines(syncedLines);
    setSelectedLineId(syncedLines[0]?.id || null);
    setMessage("Auto-sync complete. Review fallback lines manually.");
  }

  return (
    <CollapsiblePanel
      title="Script Override"
      subtitle="Whisper creates timed lines automatically. Paste custom lines only to replace them."
    >

      <textarea
        value={scriptText}
        onChange={(event) => setScriptText(event.target.value)}
        rows={8}
        className="w-full resize-y rounded-md border border-white/10 bg-black/35 p-3 text-sm leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
        placeholder="Bro...&#10;You don't even fail creatively."
      />

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={handleLoadSampleScript}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black uppercase leading-4 tracking-[0.08em] text-slate-200 transition hover:bg-white/10"
        >
          Load Sample
        </button>
        <button
          type="button"
          onClick={handleUseTranscript}
          disabled={!transcriptText}
          className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2.5 text-xs font-black uppercase leading-4 tracking-[0.08em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
        >
          Use Transcript
        </button>
        <button
          type="button"
          onClick={handleCreateLines}
          disabled={!hasScriptText}
          className="rounded-md bg-white px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Create Lines
        </button>
        <button
          type="button"
          onClick={handleAutoSync}
          disabled={!canAutoSync}
          className="rounded-md bg-violet-300 px-3 py-2.5 text-xs font-black uppercase leading-4 tracking-[0.08em] text-slate-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Auto-sync lines with Whisper
        </button>
      </div>

      {message ? <p className="mt-3 text-xs text-slate-400">{message}</p> : null}
      {autoSyncDisabledReason ? (
        <p className="mt-2 text-xs text-amber-200">{autoSyncDisabledReason}</p>
      ) : null}
    </CollapsiblePanel>
  );
}
