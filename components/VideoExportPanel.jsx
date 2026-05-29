"use client";

import { useEffect, useMemo, useState } from "react";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import {
  exportRenderedVideo,
  getExportFormatSupport,
} from "@/utils/exportVideo";

function formatPercent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export default function VideoExportPanel({
  audioUrl,
  backgroundMusicUrl,
  backgroundMusicVolumePct,
  lines,
  durationMs,
}) {
  const [support, setSupport] = useState({
    mimeType: "",
    extension: "webm",
    supportsMp4: false,
  });
  const [exportingFormat, setExportingFormat] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");
  const canExport = Boolean(audioUrl && lines.length && durationMs);
  const isExporting = Boolean(exportingFormat);

  useEffect(() => {
    setSupport(getExportFormatSupport());
  }, []);

  const formatNote = useMemo(() => {
    if (!support.mimeType) {
      return "No browser encoder detected yet.";
    }

    if (support.supportsMp4) {
      return "Browser MP4 export is available.";
    }

    return "This browser will export WebM unless MP4 recording is available.";
  }, [support]);

  async function handleExport(format) {
    setExportingFormat(format);
    setProgress(0);
    setStatus("Starting");
    setMessage("");

    try {
      const result = await exportRenderedVideo({
        lines,
        audioUrl,
        backgroundMusicUrl,
        backgroundMusicVolumePct,
        durationMs,
        format,
        onProgress: setProgress,
        onStatus: setStatus,
      });

      setProgress(1);
      setStatus("Done");
      setMessage(
        result.extension === "mp4"
          ? `Downloaded ${result.filename}.`
          : `Downloaded ${result.filename}. Your browser did not expose MP4 recording for this export.`
      );
    } catch (error) {
      setMessage(error?.message || "Export failed.");
      setStatus("Failed");
    } finally {
      setExportingFormat("");
    }
  }

  return (
    <CollapsiblePanel
      title="Download"
      subtitle="Records the rendered canvas with the uploaded audio."
      rightContent={
        <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
          {support.extension.toUpperCase()}
        </span>
      }
    >

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canExport || isExporting}
          onClick={() => handleExport("reels")}
          className="rounded-md border border-cyan-300/35 bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
        >
          {exportingFormat === "reels" ? "Exporting Reel" : "Download Reel"}
        </button>
        <button
          type="button"
          disabled={!canExport || isExporting}
          onClick={() => handleExport("youtube")}
          className="rounded-md border border-violet-300/35 bg-violet-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
        >
          {exportingFormat === "youtube"
            ? "Exporting YouTube"
            : "Download YouTube"}
        </button>
      </div>

      <div className="mt-3 rounded-md border border-white/10 bg-black/25 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-400">
            {isExporting ? status || "Recording" : "Encoder"}
          </span>
          <span className="font-bold text-slate-200">
            {isExporting ? formatPercent(progress) : support.extension.toUpperCase()}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 transition-[width] duration-200"
            style={{ width: isExporting ? formatPercent(progress) : "0%" }}
          />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {message || formatNote}
        </p>
      </div>
    </CollapsiblePanel>
  );
}
