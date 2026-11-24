"use client";

import React, { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { SAMPLE_BSC_WALLETS } from "@/lib/constants";
import type { RoastApiResponse, RoastLanguage } from "@/lib/schemas";
import { getUiCopy } from "@/lib/i18n";
import { ProTradingCoach } from "./ProTradingCoach";
import {
  Flame,
  Search,
  Share2,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Fuel,
  Wallet,
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";

interface RoastDashboardProps {
  lang: RoastLanguage;
}

export function RoastDashboard({ lang }: RoastDashboardProps) {
  const [addressInput, setAddressInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [roastData, setRoastData] = useState<RoastApiResponse | null>(null);
  const activeRequestId = useRef(0);

  const copy = getUiCopy(lang);

  async function handleRoastSubmit(
    targetAddress?: string,
    targetLang: RoastLanguage = lang
  ) {
    const candidate = (targetAddress ?? addressInput).trim();
    const activeCopy = getUiCopy(targetLang);
    setValidationError(null);

    if (!candidate) {
      setValidationError(activeCopy.errors.emptyAddress);
      return;
    }

    if (!isAddress(candidate)) {
      setValidationError(activeCopy.errors.invalidAddress);
      return;
    }

    const reqId = ++activeRequestId.current;
    setIsLoading(true);
    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: candidate, lang: targetLang }),
      });

      const data = await response.json();
      if (reqId !== activeRequestId.current) return;

      if (!response.ok) {
        setValidationError(data.error || activeCopy.errors.apiFailed);
        return;
      }

      setRoastData(data as RoastApiResponse);
    } catch {
      if (reqId !== activeRequestId.current) return;
      setValidationError(activeCopy.errors.networkError);
    } finally {
      if (reqId === activeRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  // When user toggles TH <-> EN while viewing a roast result, automatically regenerate in the selected language
  useEffect(() => {
    if (roastData && roastData.lang !== lang) {
      void handleRoastSubmit(roastData.summary.address, lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  function handleShareOnX() {
    if (!roastData) return;

    const { summary, result, lang: resultLang } = roastData;
    const shortAddr = `${summary.address.slice(0, 6)}...${summary.address.slice(-4)}`;
    const appOrigin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://ai-wallet-copilot.vercel.app";

    const ogUrl = `${appOrigin}/api/og?lang=${encodeURIComponent(
      resultLang
    )}&address=${encodeURIComponent(
      summary.address
    )}&score=${encodeURIComponent(
      String(result.degenScore)
    )}&archetype=${encodeURIComponent(
      result.archetype
    )}&roast=${encodeURIComponent(result.roast)}`;

    const tweetText =
      resultLang === "th"
        ? `🔥 กระเป๋า BNB Chain (${shortAddr}) ของฉันเพิ่งโดน AI Wallet Copilot ($COAI) แฉนิสัยการเทรด!\n\n🏆 ฉายา: "${result.archetype}"\n💀 คะแนนดีเจน: ${result.degenScore}/100\n\n"${result.roast.slice(0, 120)}..."\n\nลองแปะ Address ของคุณดู (ไม่ต้องเชื่อมต่อกระเป๋า):`
        : `🔥 My BNB Chain wallet (${shortAddr}) just got roasted by AI Wallet Copilot ($COAI)!\n\n🏆 Archetype: "${result.archetype}"\n💀 Degen Score: ${result.degenScore}/100\n\n"${result.roast.slice(0, 140)}..."\n\nPaste your address (No wallet connect needed):`;

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText
    )}&url=${encodeURIComponent(ogUrl)}`;

    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }

  const score = roastData?.result.degenScore ?? 0;
  const scoreBadgeClass =
    score >= 75
      ? "text-amber-400 border-amber-500/40 bg-amber-500/15"
      : score >= 35
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/15"
      : "text-sky-400 border-sky-500/40 bg-sky-500/15";

  return (
    <div className="space-y-8">
      {/* Hero Input Card */}
      <section className="glass-panel relative overflow-hidden rounded-3xl p-6 sm:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>{copy.hero.badge}</span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
            {copy.hero.titlePrefix}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-400 bg-clip-text text-transparent">
              {copy.hero.titleHighlight}
            </span>
          </h1>

          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            {copy.hero.descriptionPre}
            <span className="font-semibold text-amber-300">BNB Smart Chain</span>
            {copy.hero.descriptionPost}
          </p>

          {/* Address Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleRoastSubmit();
            }}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder={copy.hero.inputPlaceholder}
                aria-label={copy.hero.inputAriaLabel}
                className="w-full rounded-2xl border border-white/15 bg-slate-950/90 py-4 pl-12 pr-4 font-mono text-sm text-white placeholder-slate-500 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-amber-500 px-7 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{copy.hero.submitLoading}</span>
                </>
              ) : (
                <>
                  <Flame className="h-5 w-5 fill-slate-950" />
                  <span>{copy.hero.submitIdle}</span>
                </>
              )}
            </button>
          </form>

          {/* Validation / Error Banner */}
          {validationError && (
            <div
              role="alert"
              className="mt-4 flex items-start justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-left text-xs font-medium text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span className="break-all">{validationError}</span>
            </div>
          )}

          {/* Quick Sample Wallets for Instant Demo */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400">{copy.hero.presetLabel}</span>
            {SAMPLE_BSC_WALLETS.map((sample) => (
              <button
                key={sample.address}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setAddressInput(sample.address);
                  void handleRoastSubmit(sample.address, lang);
                }}
                className="rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 font-medium text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300"
              >
                {copy.hero.presetNames[sample.address] ?? sample.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Roast Results Section */}
      {roastData && (
        <div
          className={`space-y-6 transition-opacity ${
            isLoading ? "opacity-60" : "opacity-100"
          }`}
        >
          {/* Main Shareable Roast Card */}
          <div className="glass-panel-emerald rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              {/* Left: Archetype & Roast Text */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {copy.result.archetypeBadge}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 font-mono text-xs text-slate-300">
                    {roastData.summary.address.slice(0, 8)}...
                    {roastData.summary.address.slice(-6)}
                  </span>
                  {isLoading && roastData.lang !== lang && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {copy.result.switchingLang}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl font-black tracking-tight text-white sm:text-4xl">
                  “{roastData.result.archetype}”
                </h2>

                <blockquote className="rounded-2xl border border-white/10 bg-slate-950/75 p-5 text-sm leading-relaxed text-slate-200 sm:text-base">
                  {roastData.result.roast}
                </blockquote>

                {/* Share on X & Preview OG Image Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleShareOnX}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-md transition hover:bg-emerald-300"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{copy.result.shareOnX}</span>
                  </button>

                  <a
                    href={`/api/og?lang=${encodeURIComponent(
                      roastData.lang
                    )}&address=${encodeURIComponent(
                      roastData.summary.address
                    )}&score=${encodeURIComponent(
                      String(roastData.result.degenScore)
                    )}&archetype=${encodeURIComponent(
                      roastData.result.archetype
                    )}&roast=${encodeURIComponent(roastData.result.roast)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/80 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
                  >
                    <span>{copy.result.viewOgCard}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Right: Degen Score Meter */}
              <div
                className={`flex shrink-0 flex-col items-center justify-center rounded-3xl border-2 p-6 text-center lg:w-52 lg:h-52 ${scoreBadgeClass}`}
              >
                <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                  {copy.result.degenScore}
                </span>
                <span className="mt-1 text-6xl font-black tracking-tighter">
                  {roastData.result.degenScore}
                </span>
                <span className="text-xs font-semibold opacity-75">
                  {copy.result.outOf100}
                </span>
                <div className="mt-3 h-2 w-36 overflow-hidden rounded-full bg-slate-950/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-500"
                    style={{ width: `${roastData.result.degenScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 30-Day On-Chain Telemetry Grid */}
            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  <span>{copy.result.nativeBalance}</span>
                </div>
                <p className="mt-1.5 font-mono text-lg font-bold text-white">
                  {roastData.summary.nativeBnbBalance} BNB
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Activity className="h-4 w-4 text-amber-400" />
                  <span>{copy.result.txCount30d}</span>
                </div>
                <p className="mt-1.5 font-mono text-lg font-bold text-white">
                  {roastData.summary.txCount30d} {copy.result.txUnit}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ArrowLeftRight className="h-4 w-4 text-emerald-400" />
                  <span>{copy.result.tokenTransfers30d}</span>
                </div>
                <p className="mt-1.5 font-mono text-lg font-bold text-white">
                  {roastData.summary.tokenTransferCount30d}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Fuel className="h-4 w-4 text-amber-400" />
                  <span>{copy.result.gasBurned30d}</span>
                </div>
                <p className="mt-1.5 font-mono text-lg font-bold text-white">
                  {roastData.summary.totalGasSpentBnb} BNB
                </p>
              </div>
            </div>

            {/* Top Interacted Tokens */}
            {roastData.summary.topInteractedTokens.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">{copy.result.topTokens}</span>
                {roastData.summary.topInteractedTokens.map((tok) => (
                  <span
                    key={tok.symbol}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono font-semibold text-emerald-300"
                  >
                    ${tok.symbol} ({tok.count}x)
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Token-Gated Pro Trading Coach ($COAI) */}
          <ProTradingCoach
            proAdvice={roastData.result.proAdvice}
            archetype={roastData.result.archetype}
            lang={lang}
          />
        </div>
      )}
    </div>
  );
}
