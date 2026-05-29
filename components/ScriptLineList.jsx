"use client";

import CollapsiblePanel from "@/components/CollapsiblePanel";
import { getMediaSummary } from "@/utils/media";
import { msToTime } from "@/utils/time";

function makeLineId() {
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeManual(line) {
  return {
    ...line,
    syncStatus: "manual",
    matchScore: null,
    matchedWords: [],
  };
}

function SyncBadge({ status }) {
  const classes = {
    matched: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
    fallback: "border-amber-300/30 bg-amber-300/10 text-amber-200",
    manual: "border-slate-300/20 bg-slate-300/10 text-slate-300",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
        classes[status] || classes.manual
      }`}
    >
      {status || "manual"}
    </span>
  );
}

export default function ScriptLineList({
  lines,
  setLines,
  selectedLineId,
  setSelectedLineId,
  activeLineId,
  videoSettings,
}) {
  function updateLineText(lineId, text) {
    setLines((currentLines) =>
      currentLines.map((line) =>
        line.id === lineId ? makeManual({ ...line, text }) : line
      )
    );
  }

  function addLine() {
    setLines((currentLines) => {
      const lastLine = currentLines[currentLines.length - 1];
      const startMs = lastLine ? lastLine.endMs : 0;
      const nextLine = {
        id: makeLineId(),
        text: "New line",
        ...videoSettings,
        media: lastLine?.media || videoSettings.media,
        mediaType: lastLine?.mediaType || videoSettings.mediaType,
        startMs,
        endMs: startMs + 2000,
        syncStatus: "manual",
        matchScore: null,
        matchedWords: [],
      };

      setSelectedLineId(nextLine.id);
      return [...currentLines, nextLine];
    });
  }

  function deleteLine(lineId) {
    setLines((currentLines) => {
      const index = currentLines.findIndex((line) => line.id === lineId);
      const nextLines = currentLines.filter((line) => line.id !== lineId);
      const nextSelected = nextLines[Math.max(0, index - 1)]?.id || nextLines[0]?.id || null;
      setSelectedLineId(nextSelected);
      return nextLines;
    });
  }

  function duplicateLine(lineId) {
    setLines((currentLines) => {
      const index = currentLines.findIndex((line) => line.id === lineId);

      if (index === -1) {
        return currentLines;
      }

      const source = currentLines[index];
      const duration = Math.max(700, source.endMs - source.startMs);
      const duplicate = {
        ...source,
        id: makeLineId(),
        startMs: source.endMs,
        endMs: source.endMs + duration,
        syncStatus: "manual",
        matchScore: null,
        matchedWords: [],
      };
      const nextLines = [...currentLines];
      nextLines.splice(index + 1, 0, duplicate);
      setSelectedLineId(duplicate.id);

      return nextLines;
    });
  }

  function moveLine(lineId, direction) {
    setLines((currentLines) => {
      const index = currentLines.findIndex((line) => line.id === lineId);
      const nextIndex = index + direction;

      if (index === -1 || nextIndex < 0 || nextIndex >= currentLines.length) {
        return currentLines;
      }

      const nextLines = [...currentLines];
      [nextLines[index], nextLines[nextIndex]] = [nextLines[nextIndex], nextLines[index]];
      return nextLines;
    });
  }

  return (
    <CollapsiblePanel
      title="Lines"
      subtitle={`${lines.length} timed visual slides.`}
      defaultOpen
      rightContent={
        <button
          type="button"
          onClick={addLine}
          className="rounded-md bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-slate-200"
        >
          Add
        </button>
      }
    >

      <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
        {lines.map((line, index) => {
          const isSelected = line.id === selectedLineId;
          const isActive = line.id === activeLineId;

          return (
            <article
              key={line.id}
              onClick={() => setSelectedLineId(line.id)}
              className={`rounded-md border p-3 transition ${
                isSelected
                  ? "border-cyan-300/60 bg-cyan-300/10"
                  : isActive
                    ? "border-violet-300/50 bg-violet-300/10"
                    : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-[11px] font-black text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <SyncBadge status={line.syncStatus} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveLine(line.id, -1);
                    }}
                    className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-xs font-black text-slate-300 transition hover:bg-white/10"
                    aria-label="Move line up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveLine(line.id, 1);
                    }}
                    className="h-7 w-7 rounded-md border border-white/10 bg-white/5 text-xs font-black text-slate-300 transition hover:bg-white/10"
                    aria-label="Move line down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      duplicateLine(line.id);
                    }}
                    className="h-7 rounded-md border border-white/10 bg-white/5 px-2 text-[11px] font-bold text-slate-300 transition hover:bg-white/10"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteLine(line.id);
                    }}
                    className="h-7 rounded-md border border-rose-300/20 bg-rose-300/10 px-2 text-[11px] font-bold text-rose-200 transition hover:bg-rose-300/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <input
                value={line.text}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => updateLineText(line.id, event.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/35 px-2 py-2 text-sm font-semibold text-slate-100 outline-none transition focus:border-cyan-300/60"
              />

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span>
                  {msToTime(line.startMs)} → {msToTime(line.endMs)}
                </span>
                <span className="max-w-full truncate">{getMediaSummary(line)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}
