"use client";

import { useState } from "react";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import { createLinesFromWhisper } from "@/utils/script";

export default function AudioUploadTranscribe({
  audioFile,
  audioUrl,
  setAudioFile,
  setAudioUrl,
  setTranscriptText,
  setWhisperWords,
  setWhisperSegments,
  setDurationMs,
  setLines,
  setSelectedLineId,
  videoSettings,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  function handleFileSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setError("");
    setStatus("Audio loaded locally.");
  }

  async function handleTranscribe() {
    if (!audioFile) {
      setError("Choose a voiceover audio file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setStatus("Sending audio to Whisper...");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Transcription failed.");
      }

      setTranscriptText(payload.text || "");
      setTranscriptPreview(payload.text || "");
      const nextWords = Array.isArray(payload.words) ? payload.words : [];
      const nextSegments = Array.isArray(payload.segments) ? payload.segments : [];
      const nextDurationMs =
        Number(payload.duration) > 0 ? Math.round(payload.duration * 1000) : 0;
      const whisperLines = createLinesFromWhisper({
        text: payload.text || "",
        words: nextWords,
        segments: nextSegments,
        durationMs: nextDurationMs,
        visualDefaults: videoSettings,
      });

      setWhisperWords(nextWords);
      setWhisperSegments(nextSegments);

      if (Number(payload.duration) > 0) {
        setDurationMs(nextDurationMs);
      }

      if (whisperLines.length) {
        setLines(whisperLines);
        setSelectedLineId(whisperLines[0]?.id || null);
      }

      setStatus(
        `Whisper created ${whisperLines.length} timed lines from ${nextWords.length} words.`
      );
      setIsTranscriptOpen(true);
    } catch (transcribeError) {
      setError(transcribeError.message || "Transcription failed.");
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <CollapsiblePanel
      title="Voiceover"
      subtitle="Upload locally, then transcribe on the server."
      defaultOpen
      rightContent={
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-200">
          Whisper
        </span>
      }
    >

      <label className="block cursor-pointer rounded-md border border-dashed border-white/15 bg-black/20 p-4 text-sm text-slate-300 transition hover:border-cyan-300/60 hover:bg-cyan-400/5">
        <input
          className="sr-only"
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a,audio/webm,audio/ogg,.mp3,.wav,.m4a,.mp4,.webm,.ogg"
          onChange={handleFileSelect}
        />
        <span className="block font-semibold text-white">
          {audioFile ? audioFile.name : "Choose voiceover audio"}
        </span>
        <span className="mt-1 block text-xs text-slate-500">
          MP3, WAV, M4A, MP4, WebM, or OGG
        </span>
      </label>

      <button
        type="button"
        onClick={handleTranscribe}
        disabled={!audioFile || isLoading}
        className="mt-3 w-full rounded-md bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isLoading ? "Transcribing..." : "Transcribe with Whisper"}
      </button>

      {status ? <p className="mt-3 text-xs text-emerald-300">{status}</p> : null}
      {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

      {transcriptPreview ? (
        <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-black/25">
          <button
            type="button"
            onClick={() => setIsTranscriptOpen((open) => !open)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/5"
          >
            Transcript Preview
            <span className="text-slate-500">{isTranscriptOpen ? "Hide" : "Show"}</span>
          </button>
          {isTranscriptOpen ? (
            <p className="max-h-36 overflow-auto border-t border-white/10 p-3 text-xs leading-5 text-slate-300">
              {transcriptPreview}
            </p>
          ) : null}
        </div>
      ) : null}
    </CollapsiblePanel>
  );
}
