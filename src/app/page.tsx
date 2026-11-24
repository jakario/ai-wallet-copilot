"use client";

import React, { useState } from "react";
import { Navbar, type CopilotPhaseTab } from "@/components/Navbar";
import { RoastDashboard } from "@/components/RoastDashboard";
import { SecurityGuard } from "@/components/SecurityGuard";
import { PhasePreviewCard } from "@/components/PhasePreviewCard";
import { COAI_TOKEN_ADDRESS } from "@/lib/constants";
import type { RoastLanguage } from "@/lib/schemas";
import { getUiCopy } from "@/lib/i18n";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<CopilotPhaseTab>("roast");
  const [lang, setLang] = useState<RoastLanguage>("th");
  const copy = getUiCopy(lang);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        lang={lang}
        onChangeLang={setLang}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className={activeTab === "roast" ? "block" : "hidden"}>
          <RoastDashboard lang={lang} />
        </div>

        <div className={activeTab === "security" ? "block" : "hidden"}>
          <SecurityGuard lang={lang} />
        </div>

        {activeTab === "testnet" && (
          <PhasePreviewCard
            phase="testnet"
            lang={lang}
            onBackToRoast={() => setActiveTab("roast")}
          />
        )}
      </main>

      <footer className="border-t border-white/10 bg-slate-950/70 py-6 text-center text-xs text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p>
            <span className="font-bold text-slate-200">AI Wallet Copilot</span>{" "}
            — {copy.footer.slogan}
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            $COAI (BSC):{" "}
            <a
              href={`https://bscscan.com/token/${COAI_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 underline-offset-2 hover:underline"
            >
              {COAI_TOKEN_ADDRESS}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
