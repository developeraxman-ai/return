"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AudioPlayerController from "@/components/AudioPlayerController";
import AudioTimeline from "@/components/AudioTimeline";
import AudioUploadTranscribe from "@/components/AudioUploadTranscribe";
import AiImageGeneratorPanel from "@/components/AiImageGeneratorPanel";
import BackgroundMusicPanel from "@/components/BackgroundMusicPanel";
import FullscreenRender from "@/components/FullscreenRender";
import ImagePromptExportPanel from "@/components/ImagePromptExportPanel";
import LineInspector from "@/components/LineInspector";
import ScriptImporter from "@/components/ScriptImporter";
import ScriptLineList from "@/components/ScriptLineList";
import VideoExportPanel from "@/components/VideoExportPanel";
import VideoPreview from "@/components/VideoPreview";
import VideoSettingsPanel from "@/components/VideoSettingsPanel";
import { RETURN_40S_IMAGE_PLAN, getImagePlanForTime } from "@/data/imagePlans";
import { setLineMediaForFormat } from "@/utils/media";
import { DEFAULT_VISUALS } from "@/utils/script";
import { clamp, getActiveLine, msToTime } from "@/utils/time";

const initialDurationMs = 0;

export default function HomePage() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [backgroundMusicFile, setBackgroundMusicFile] = useState(null);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState("");
  const [backgroundMusicVolumePct, setBackgroundMusicVolumePct] = useState(18);
  const [transcriptText, setTranscriptText] = useState("");
  const [whisperWords, setWhisperWords] = useState([]);
  const [whisperSegments, setWhisperSegments] = useState([]);
  const [lines, setLines] = useState([]);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(initialDurationMs);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreenRenderOpen, setIsFullscreenRenderOpen] = useState(false);
  const [seekCommand, setSeekCommand] = useState(null);
  const [videoSettings, setVideoSettings] = useState(DEFAULT_VISUALS);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (backgroundMusicUrl) {
        URL.revokeObjectURL(backgroundMusicUrl);
      }
    };
  }, [backgroundMusicUrl]);

  const activeLine = useMemo(
    () => getActiveLine(lines, currentTimeMs),
    [lines, currentTimeMs]
  );

  const handleSeek = useCallback(
    (targetMs) => {
      const maxDuration = Math.max(durationMs || 0, 1);
      const nextTimeMs = clamp(Number(targetMs), 0, maxDuration);
      setCurrentTimeMs(nextTimeMs);
      setSeekCommand({ id: `${Date.now()}-${Math.random()}`, ms: nextTimeMs });
    },
    [durationMs]
  );

  const handleVideoSettingChange = useCallback((field, value) => {
    setVideoSettings((currentSettings) => ({
      ...currentSettings,
      [field]: value,
    }));
    setLines((currentLines) =>
      currentLines.map((line) => ({
        ...line,
        [field]: value,
      }))
    );
  }, []);

  const handleApplyReturnImagePlan = useCallback(() => {
    setLines((currentLines) =>
      currentLines.map((line) => {
        const planItem = getImagePlanForTime(RETURN_40S_IMAGE_PLAN, line.startMs);

        if (!planItem) {
          return line;
        }

        const mediaPatch = {
          media: planItem.media,
          mediaType: planItem.mediaType,
        };
        const reelsLine = setLineMediaForFormat(line, "reels", mediaPatch);
        return setLineMediaForFormat(reelsLine, "youtube", mediaPatch);
      })
    );
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_34%),linear-gradient(135deg,#050609_0%,#11131a_45%,#06070a_100%)] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/65 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
              Faceless Video Studio
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[0.08em] text-white">
              THE RETURN Editor
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {lines.length} lines
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {whisperWords.length} Whisper words
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              {msToTime(currentTimeMs)} / {msToTime(durationMs)}
            </span>
            <FullscreenRender
              isOpen={isFullscreenRenderOpen}
              setIsOpen={setIsFullscreenRenderOpen}
              audioUrl={audioUrl}
              lines={lines}
              currentTimeMs={currentTimeMs}
              setCurrentTimeMs={setCurrentTimeMs}
              durationMs={durationMs}
              setDurationMs={setDurationMs}
              setIsPlaying={setIsPlaying}
              selectedLineId={selectedLineId}
              backgroundMusicUrl={backgroundMusicUrl}
              backgroundMusicVolumePct={backgroundMusicVolumePct}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1800px] gap-4 px-4 py-4 xl:grid-cols-[minmax(360px,0.86fr)_minmax(520px,1.14fr)]">
        <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/30">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
                Preview
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Active line: {activeLine ? activeLine.id : "none"}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${
                isPlaying
                  ? "bg-emerald-300/15 text-emerald-200"
                  : "bg-slate-300/10 text-slate-400"
              }`}
            >
              {isPlaying ? "Playing" : "Paused"}
            </div>
          </div>

          <div className="grid items-start gap-4 2xl:grid-cols-[minmax(220px,0.78fr)_minmax(320px,1.22fr)]">
            <div className="mx-auto w-full max-w-[430px]">
              <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                <span>Reels Preview</span>
                <span>9:16</span>
              </div>
              <VideoPreview
                lines={lines}
                currentTimeMs={currentTimeMs}
                selectedLineId={selectedLineId}
                format="reels"
              />
            </div>
            <div className="w-full">
              <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                <span>YouTube Preview</span>
                <span>16:9</span>
              </div>
              <VideoPreview
                lines={lines}
                currentTimeMs={currentTimeMs}
                selectedLineId={selectedLineId}
                format="youtube"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="font-black uppercase tracking-[0.14em] text-slate-500">
                Transcript
              </p>
              <p className="mt-2 line-clamp-3 leading-5">
                {transcriptText || "No Whisper transcript yet."}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/25 p-3">
              <p className="font-black uppercase tracking-[0.14em] text-slate-500">
                Segments
              </p>
              <p className="mt-2 leading-5">
                {whisperSegments.length
                  ? `${whisperSegments.length} segments returned`
                  : "Waiting for transcription."}
              </p>
            </div>
          </div>
        </section>

        <aside className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(300px,0.9fr)_minmax(340px,1.1fr)]">
          <div className="space-y-4">
            <AudioUploadTranscribe
              audioFile={audioFile}
              audioUrl={audioUrl}
              setAudioFile={setAudioFile}
              setAudioUrl={setAudioUrl}
              setTranscriptText={setTranscriptText}
              setWhisperWords={setWhisperWords}
              setWhisperSegments={setWhisperSegments}
              setDurationMs={setDurationMs}
              setLines={setLines}
              setSelectedLineId={setSelectedLineId}
              videoSettings={videoSettings}
            />
            <BackgroundMusicPanel
              backgroundMusicFile={backgroundMusicFile}
              backgroundMusicUrl={backgroundMusicUrl}
              setBackgroundMusicFile={setBackgroundMusicFile}
              setBackgroundMusicUrl={setBackgroundMusicUrl}
              backgroundMusicVolumePct={backgroundMusicVolumePct}
              setBackgroundMusicVolumePct={setBackgroundMusicVolumePct}
            />
            <ImagePromptExportPanel
              transcriptText={transcriptText}
              lines={lines}
              durationMs={durationMs}
            />
            <AiImageGeneratorPanel
              lines={lines}
              setLines={setLines}
            />
            <VideoSettingsPanel
              videoSettings={videoSettings}
              onChangeSetting={handleVideoSettingChange}
              lineCount={lines.length}
              imagePlan={RETURN_40S_IMAGE_PLAN}
              onApplyImagePlan={handleApplyReturnImagePlan}
            />
            <VideoExportPanel
              audioUrl={audioUrl}
              backgroundMusicUrl={backgroundMusicUrl}
              backgroundMusicVolumePct={backgroundMusicVolumePct}
              lines={lines}
              durationMs={durationMs}
            />
            <ScriptImporter
              lines={lines}
              setLines={setLines}
              durationMs={durationMs}
              whisperWords={whisperWords}
              transcriptText={transcriptText}
              setSelectedLineId={setSelectedLineId}
              videoSettings={videoSettings}
            />
            <LineInspector
              selectedLineId={selectedLineId}
              lines={lines}
              setLines={setLines}
              durationMs={durationMs}
            />
          </div>

          <ScriptLineList
            lines={lines}
            setLines={setLines}
            selectedLineId={selectedLineId}
            setSelectedLineId={setSelectedLineId}
            activeLineId={activeLine?.id || null}
            videoSettings={videoSettings}
          />
        </aside>
      </div>

      <div className="mx-auto max-w-[1800px] space-y-4 px-4 pb-4">
        <AudioPlayerController
          audioUrl={audioUrl}
          currentTimeMs={currentTimeMs}
          setCurrentTimeMs={setCurrentTimeMs}
          durationMs={durationMs}
          setDurationMs={setDurationMs}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          selectedLineId={selectedLineId}
          lines={lines}
          setLines={setLines}
          onSeek={handleSeek}
          seekCommand={seekCommand}
          backgroundMusicUrl={backgroundMusicUrl}
          backgroundMusicVolumePct={backgroundMusicVolumePct}
        />
        <AudioTimeline
          lines={lines}
          setLines={setLines}
          selectedLineId={selectedLineId}
          setSelectedLineId={setSelectedLineId}
          currentTimeMs={currentTimeMs}
          durationMs={durationMs}
          activeLineId={activeLine?.id || null}
          onSeek={handleSeek}
        />
      </div>
    </main>
  );
}
