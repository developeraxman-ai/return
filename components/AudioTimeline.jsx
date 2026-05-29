"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clamp, msToTime } from "@/utils/time";

const MIN_LINE_DURATION_MS = 120;

function getLinePreview(text) {
  if (!text) {
    return "Untitled";
  }

  return text.length > 34 ? `${text.slice(0, 31)}...` : text;
}

export default function AudioTimeline({
  lines,
  setLines,
  selectedLineId,
  setSelectedLineId,
  currentTimeMs,
  durationMs,
  activeLineId,
  onSeek,
}) {
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const timelineDurationMs = useMemo(() => {
    const maxLineEnd = lines.reduce((max, line) => Math.max(max, line.endMs || 0), 0);
    return Math.max(durationMs || 0, maxLineEnd, 1);
  }, [durationMs, lines]);
  const timelineHeight = Math.max(96, lines.length * 34 + 28);

  function timeFromClientX(clientX) {
    const rect = trackRef.current?.getBoundingClientRect();

    if (!rect || rect.width <= 0) {
      return 0;
    }

    const x = clamp(clientX - rect.left, 0, rect.width);
    return Math.round((x / rect.width) * timelineDurationMs);
  }

  function startDrag(event, type, line) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedLineId(line.id);

    const pointerTimeMs = timeFromClientX(event.clientX);
    setDrag({
      type,
      lineId: line.id,
      originPointerMs: pointerTimeMs,
      originStartMs: line.startMs,
      originEndMs: line.endMs,
    });
  }

  useEffect(() => {
    if (!drag) {
      return undefined;
    }

    function handlePointerMove(event) {
      const pointerTimeMs = timeFromClientX(event.clientX);

      setLines((currentLines) =>
        currentLines.map((line) => {
          if (line.id !== drag.lineId) {
            return line;
          }

          if (drag.type === "move") {
            const duration = Math.max(
              MIN_LINE_DURATION_MS,
              drag.originEndMs - drag.originStartMs
            );
            const deltaMs = pointerTimeMs - drag.originPointerMs;
            const startMs = clamp(
              drag.originStartMs + deltaMs,
              0,
              Math.max(0, timelineDurationMs - duration)
            );

            return {
              ...line,
              startMs,
              endMs: startMs + duration,
              syncStatus: "manual",
              matchScore: null,
              matchedWords: [],
            };
          }

          if (drag.type === "start") {
            return {
              ...line,
              startMs: clamp(pointerTimeMs, 0, line.endMs - MIN_LINE_DURATION_MS),
              syncStatus: "manual",
              matchScore: null,
              matchedWords: [],
            };
          }

          return {
            ...line,
            endMs: clamp(pointerTimeMs, line.startMs + MIN_LINE_DURATION_MS, timelineDurationMs),
            syncStatus: "manual",
            matchScore: null,
            matchedWords: [],
          };
        })
      );
    }

    function handlePointerUp() {
      setDrag(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, setLines, timelineDurationMs]);

  function handleTrackPointerDown(event) {
    if (event.target !== event.currentTarget && event.target.dataset.seekSurface !== "true") {
      return;
    }

    onSeek(timeFromClientX(event.clientX));
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
            Timeline
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Drag blocks or handles to correct caption timing.
          </p>
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          <div>{msToTime(currentTimeMs)}</div>
          <div>{msToTime(timelineDurationMs)}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-white/10 bg-black/35 p-3">
        <div
          ref={trackRef}
          role="presentation"
          onPointerDown={handleTrackPointerDown}
          className="relative min-w-[900px] select-none rounded-md bg-slate-950/90"
          style={{ height: `${timelineHeight}px` }}
          data-seek-surface="true"
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px)]"
            style={{ backgroundSize: "10% 100%" }}
            data-seek-surface="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-30 w-px bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.9)]"
            style={{
              left: `${(clamp(currentTimeMs, 0, timelineDurationMs) / timelineDurationMs) * 100}%`,
            }}
          >
            <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-cyan-200" />
          </div>

          {lines.map((line, index) => {
            const left = (clamp(line.startMs, 0, timelineDurationMs) / timelineDurationMs) * 100;
            const width =
              ((clamp(line.endMs, line.startMs, timelineDurationMs) -
                clamp(line.startMs, 0, timelineDurationMs)) /
                timelineDurationMs) *
              100;
            const isSelected = line.id === selectedLineId;
            const isActive = line.id === activeLineId;

            return (
              <div
                key={line.id}
                className={`absolute z-10 h-7 cursor-grab overflow-hidden rounded-md border px-2 py-1 text-xs font-bold leading-5 transition active:cursor-grabbing ${
                  isSelected
                    ? "border-cyan-200 bg-cyan-300/30 text-white shadow-[0_0_20px_rgba(103,232,249,0.2)]"
                    : isActive
                      ? "border-violet-200/80 bg-violet-300/25 text-violet-50"
                      : "border-white/10 bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.5)}%`,
                  top: `${14 + index * 34}px`,
                }}
                onPointerDown={(event) => startDrag(event, "move", line)}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedLineId(line.id);
                }}
                title={line.text}
              >
                <button
                  type="button"
                  aria-label="Adjust line start"
                  onPointerDown={(event) => startDrag(event, "start", line)}
                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-white/25 opacity-80 hover:bg-cyan-200"
                />
                <span className="block truncate pl-1 pr-3">{getLinePreview(line.text)}</span>
                <button
                  type="button"
                  aria-label="Adjust line end"
                  onPointerDown={(event) => startDrag(event, "end", line)}
                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-white/25 opacity-80 hover:bg-cyan-200"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
