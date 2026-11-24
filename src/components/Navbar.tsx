"use client";

import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Flame, ShieldAlert, Compass, Sparkles, Languages } from "lucide-react";
import type { RoastLanguage } from "@/lib/schemas";
import { getUiCopy } from "@/lib/i18n";

export type CopilotPhaseTab = "roast" | "security" | "testnet";

interface NavbarProps {
  activeTab: CopilotPhaseTab;
  onSelectTab: (tab: CopilotPhaseTab) => void;
  lang: RoastLanguage;
  onChangeLang: (lang: RoastLanguage) => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  lang,
  onChangeLang,
}: NavbarProps) {
  const copy = getUiCopy(lang);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-amber-500 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white">
                AI Wallet Copilot
              </span>
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold tracking-wider text-emerald-300">
                $COAI
              </span>
            </div>
            <p className="text-xs text-slate-400">{copy.brandSubtitle}</p>
          </div>
        </div>

        {/* Modular 3-Phase Navigation Tabs */}
        <nav
          aria-label="Copilot Modules"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 p-1"
        >
          <button
            type="button"
            onClick={() => onSelectTab("roast")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "roast"
                ? "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/30"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>{copy.tabs.roast}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("security")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "security"
                ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{copy.tabs.security}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
                activeTab === "security"
                  ? "bg-slate-950 text-amber-400"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {copy.tabs.phase2}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("testnet")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "testnet"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>{copy.tabs.testnet}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
              {copy.tabs.phase3}
            </span>
          </button>
        </nav>

        {/* Right Controls: TH / EN Language Toggle + Optional RainbowKit Connect */}
        <div className="flex items-center gap-2.5">
          <div
            role="group"
            aria-label="Language selector"
            className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-900/90 p-1"
          >
            <Languages className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-slate-400" />
            <button
              type="button"
              onClick={() => onChangeLang("th")}
              aria-pressed={lang === "th"}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                lang === "th"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ไทย
            </button>
            <button
              type="button"
              onClick={() => onChangeLang("en")}
              aria-pressed={lang === "en"}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                lang === "en"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              EN
            </button>
          </div>

          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
