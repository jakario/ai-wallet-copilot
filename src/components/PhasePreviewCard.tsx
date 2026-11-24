"use client";

import React from "react";
import { ShieldAlert, Compass, Lock, ArrowRight } from "lucide-react";
import type { CopilotPhaseTab } from "./Navbar";
import type { RoastLanguage } from "@/lib/schemas";
import { getUiCopy } from "@/lib/i18n";

interface PhasePreviewCardProps {
  phase: Exclude<CopilotPhaseTab, "roast">;
  lang: RoastLanguage;
  onBackToRoast: () => void;
}

export function PhasePreviewCard({
  phase,
  lang,
  onBackToRoast,
}: PhasePreviewCardProps) {
  const isSecurity = phase === "security";
  const copy = getUiCopy(lang).phasePreview;

  return (
    <div className="glass-panel mx-auto max-w-3xl rounded-3xl p-8 text-center sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400">
        {isSecurity ? (
          <ShieldAlert className="h-7 w-7" />
        ) : (
          <Compass className="h-7 w-7" />
        )}
      </div>

      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
        <Lock className="h-3.5 w-3.5" />
        {isSecurity ? copy.securityBadge : copy.testnetBadge}
      </span>

      <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
        {isSecurity ? copy.securityTitle : copy.testnetTitle}
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
        {isSecurity ? copy.securityDesc : copy.testnetDesc}
      </p>

      <div className="mt-7">
        <button
          type="button"
          onClick={onBackToRoast}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-extrabold text-slate-950 transition hover:bg-emerald-400"
        >
          <span>{copy.backBtn}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
