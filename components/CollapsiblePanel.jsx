"use client";

import { useState } from "react";

export default function CollapsiblePanel({
  title,
  subtitle,
  defaultOpen = false,
  rightContent = null,
  children,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-slate-400">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rightContent}
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
            aria-expanded={isOpen}
          >
            {isOpen ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {isOpen ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
