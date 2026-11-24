"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import {
  BSC_CHAIN_ID,
  COAI_TOKEN_ADDRESS,
  COAI_THRESHOLD,
  ERC20_BALANCE_ABI,
} from "@/lib/constants";
import type { RoastLanguage } from "@/lib/schemas";
import { getUiCopy } from "@/lib/i18n";
import {
  Lock,
  Unlock,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Coins,
} from "lucide-react";

interface ProTradingCoachProps {
  proAdvice: string[];
  archetype: string;
  lang: RoastLanguage;
}

export function ProTradingCoach({
  proAdvice,
  archetype,
  lang,
}: ProTradingCoachProps) {
  const { address, isConnected } = useAccount();
  const copy = getUiCopy(lang).proCoach;

  const { data: rawBalance, isLoading: isBalanceLoading } = useReadContract({
    address: COAI_TOKEN_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: BSC_CHAIN_ID,
    query: {
      enabled: Boolean(isConnected && address),
    },
  });

  const { data: decimalsData } = useReadContract({
    address: COAI_TOKEN_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "decimals",
    chainId: BSC_CHAIN_ID,
    query: {
      enabled: Boolean(isConnected && address),
    },
  });

  const decimals = typeof decimalsData === "number" ? decimalsData : 18;
  const formattedBalance =
    typeof rawBalance === "bigint"
      ? Number(formatUnits(rawBalance, decimals))
      : 0;

  const isProUnlocked = isConnected && formattedBalance >= COAI_THRESHOLD;

  return (
    <div className="glass-panel-amber relative overflow-hidden rounded-2xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              isProUnlocked
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
            }`}
          >
            {isProUnlocked ? (
              <Unlock className="h-5 w-5" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{copy.title}</h3>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/40">
                {copy.vipBadge}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {copy.subtitlePre}
              <span className="font-semibold text-amber-300">
                “{archetype}”
              </span>
            </p>
          </div>
        </div>

        {/* Token Gate Status Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2 text-xs">
          <Coins className="h-4 w-4 text-amber-400" />
          <span className="text-slate-400">{copy.required}</span>
          <span className="font-mono font-bold text-white">
            {COAI_THRESHOLD} $COAI
          </span>
          {isConnected && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{copy.yours}</span>
              <span
                className={`font-mono font-bold ${
                  isProUnlocked ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isBalanceLoading
                  ? copy.checking
                  : `${formattedBalance.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })} $COAI`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      {isProUnlocked ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span>{copy.unlockedBanner}</span>
          </div>
          <ul className="space-y-3">
            {proAdvice.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="relative mt-6">
          {/* Blurred Teaser Preview */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none space-y-3 blur-[6px] opacity-40"
          >
            {proAdvice.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <span>{tip}</span>
              </div>
            ))}
          </div>

          {/* Lock Overlay CTA */}
          <div className="inset-0 flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-slate-950/85 p-6 text-center backdrop-blur-md sm:absolute">
            <Lock className="mb-2 h-7 w-7 text-amber-400" />
            <h4 className="text-base font-bold text-white">
              {!isConnected
                ? copy.connectHeading
                : copy.holdHeading(COAI_THRESHOLD)}
            </h4>
            <p className="mt-1 max-w-md text-xs text-slate-300">
              {copy.lockDescPre}
              <span className="font-semibold text-amber-300">
                BNB Smart Chain (Chain ID 56)
              </span>
              {copy.lockDescMid}
              <span className="font-mono font-semibold text-emerald-300">
                {COAI_THRESHOLD}+ $COAI
              </span>
              {copy.lockDescPost}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {!isConnected ? (
                <ConnectButton label={copy.connectBtnLabel} />
              ) : (
                <a
                  href={`https://pancakeswap.finance/swap?outputCurrency=${COAI_TOKEN_ADDRESS}&chain=bsc`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                >
                  <span>{copy.buyCoai}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              <a
                href={`https://bscscan.com/token/${COAI_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-amber-400/50 hover:text-white"
              >
                <span>{copy.contractLink}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
