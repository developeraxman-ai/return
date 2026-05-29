"use client";

import { useMemo, useState } from "react";
import CollapsiblePanel from "@/components/CollapsiblePanel";
import {
  buildImagePromptBrief,
  buildTimedLinesExport,
} from "@/utils/imagePromptExport";

function downloadTextFile(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function ImagePromptExportPanel({
  transcriptText,
  lines,
  durationMs,
}) {
  const [themeNotes, setThemeNotes] = useState("");
  const [message, setMessage] = useState("");
  const canExport = Boolean(lines.length || transcriptText);
  const promptBrief = useMemo(
    () => buildImagePromptBrief({ transcriptText, lines, durationMs, themeNotes }),
    [transcriptText, lines, durationMs, themeNotes]
  );
  const timedLinesExport = useMemo(
    () => buildTimedLinesExport({ transcriptText, lines, durationMs }),
    [transcriptText, lines, durationMs]
  );

  async function copyPromptBrief() {
    if (!canExport) {
      setMessage("Transcribe audio first so there is something to export.");
      return;
    }

    try {
      await navigator.clipboard.writeText(promptBrief);
      setMessage("Copied AI image brief to clipboard.");
    } catch {
      setMessage("Clipboard failed. Use Download Brief instead.");
    }
  }

  function downloadPromptBrief() {
    if (!canExport) {
      setMessage("Transcribe audio first so there is something to export.");
      return;
    }

    downloadTextFile("the-return-ai-image-brief.txt", promptBrief);
    setMessage("Downloaded AI image brief.");
  }

  function downloadTimedLinesJson() {
    if (!canExport) {
      setMessage("Transcribe audio first so there is something to export.");
      return;
    }

    downloadTextFile(
      "the-return-timed-lines.json",
      `${JSON.stringify(timedLinesExport, null, 2)}\n`,
      "application/json"
    );
    setMessage("Downloaded timed lines JSON.");
  }

  return (
    <CollapsiblePanel
      title="AI Image Brief"
      subtitle={`${lines.length} timed lines injected into a copy-ready ChatGPT prompt.`}
      rightContent={
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
            canExport
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
              : "border-white/10 bg-black/25 text-slate-500"
          }`}
        >
          {canExport ? "Ready" : "Waiting"}
        </span>
      }
    >
      <div>
        <label className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
          Emotion / theme notes
        </label>
        <textarea
          value={themeNotes}
          onChange={(event) => setThemeNotes(event.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-md border border-white/10 bg-black/35 p-3 text-sm leading-5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
          placeholder="Example: shame turning into discipline, dark comedy, Bangalore night, lonely room, gym comeback, road at dawn."
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          disabled={!canExport}
          onClick={copyPromptBrief}
          className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2.5 text-xs font-black uppercase leading-4 tracking-[0.08em] text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
        >
          Copy Brief
        </button>
        <button
          type="button"
          disabled={!canExport}
          onClick={downloadPromptBrief}
          className="rounded-md bg-white px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Download Brief
        </button>
        <button
          type="button"
          disabled={!canExport}
          onClick={downloadTimedLinesJson}
          className="rounded-md border border-violet-300/30 bg-violet-300/10 px-3 py-2.5 text-xs font-black uppercase leading-4 tracking-[0.08em] text-violet-100 transition hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-600"
        >
          Lines JSON
        </button>
      </div>

      {message ? <p className="mt-3 text-xs text-slate-400">{message}</p> : null}

      <textarea
        readOnly
        value={promptBrief}
        rows={9}
        className="mt-3 w-full resize-y rounded-md border border-white/10 bg-black/35 p-3 text-xs leading-5 text-slate-300 outline-none"
      />
    </CollapsiblePanel>
  );
}
