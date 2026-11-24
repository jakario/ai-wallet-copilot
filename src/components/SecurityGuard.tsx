"use client";

import React, { useEffect, useRef, useState } from "react";
import { isAddress, formatUnits, type Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  BSC_CHAIN_ID,
  COAI_TOKEN_ADDRESS,
  COAI_THRESHOLD,
  ERC20_APPROVE_ABI,
  ERC20_BALANCE_ABI,
  SAMPLE_BSC_TOKENS,
  SAMPLE_BSC_WALLETS,
  SAMPLE_SECURITY_URLS,
} from "@/lib/constants";
import type {
  RiskLevel,
  RoastLanguage,
  SecurityApiResponse,
  TokenSecurityReport,
} from "@/lib/schemas";
import { getUiCopy } from "@/lib/i18n";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Radar,
  Search,
  ShieldAlert,
  ShieldCheck,
  Skull,
  Sparkles,
  Unlock,
  Wallet,
  XCircle,
} from "lucide-react";

interface SecurityGuardProps {
  lang: RoastLanguage;
}

type ScanMode = "wallet" | "token" | "url";

function getRiskBadgeStyle(level: RiskLevel): string {
  if (level === "DANGER") {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  if (level === "CAUTION") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
}

function getFlagChipStyle(flag: string): string {
  const highRiskFlags = new Set([
    "HONEYPOT",
    "CANNOT_SELL_ALL",
    "HONEYPOT_CREATOR",
    "OWNERSHIP_TAKEBACK",
    "HIDDEN_OWNER",
    "PHISHING_SITE",
    "MALICIOUS_DAPP_CONTRACT",
    "PHISHING_ACTIVITY",
    "STEALING_ATTACK_DRAINER",
    "HONEYPOT_RELATED",
    "CYBERCRIME",
    "MONEY_LAUNDERING",
    "FINANCIAL_CRIME",
    "BLACKMAIL",
    "SANCTIONED",
    "MALICIOUS_CONTRACTS_CREATED",
  ]);
  if (highRiskFlags.has(flag)) {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  return "border-amber-500/40 bg-amber-500/15 text-amber-300";
}

function isValidHttpUrlInput(raw: string): boolean {
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(normalized);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

function AuditBooleanCell({
  value,
  goodWhenTrue,
}: {
  value: boolean;
  goodWhenTrue: boolean;
}) {
  const isGood = value === goodWhenTrue;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
        isGood
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {isGood ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      <span>{value ? "Yes" : "No"}</span>
    </span>
  );
}

export function SecurityGuard({ lang }: SecurityGuardProps) {
  const { address: connectedAddress, isConnected } = useAccount();
  const [scanMode, setScanMode] = useState<ScanMode>("wallet");
  const [walletInput, setWalletInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanData, setScanData] = useState<SecurityApiResponse | null>(null);
  const [revokingKey, setRevokingKey] = useState<string | null>(null);
  const [revokedTxs, setRevokedTxs] = useState<Record<string, string>>({});
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const activeRequestId = useRef(0);

  const copy = getUiCopy(lang).securityGuard;

  // Pre-fill wallet input automatically when a user connects their wallet and input is empty
  useEffect(() => {
    if (connectedAddress && !walletInput.trim()) {
      setWalletInput(connectedAddress);
    }
  }, [connectedAddress, walletInput]);

  // Read live $COAI balance on BSC (Chain ID 56) for Token-Gating
  const { data: rawCoaiBalance, isLoading: isBalanceLoading } = useReadContract({
    address: COAI_TOKEN_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: connectedAddress ? [connectedAddress] : undefined,
    chainId: BSC_CHAIN_ID,
    query: {
      enabled: Boolean(isConnected && connectedAddress),
    },
  });

  const { data: decimalsData } = useReadContract({
    address: COAI_TOKEN_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: "decimals",
    chainId: BSC_CHAIN_ID,
    query: {
      enabled: Boolean(isConnected && connectedAddress),
    },
  });

  const { writeContractAsync } = useWriteContract();

  const decimals = typeof decimalsData === "number" ? decimalsData : 18;
  const formattedCoaiBalance =
    typeof rawCoaiBalance === "bigint"
      ? Number(formatUnits(rawCoaiBalance, decimals))
      : 0;
  const isProUnlocked =
    isConnected && formattedCoaiBalance >= COAI_THRESHOLD;

  async function handleSecurityScan(
    overrideMode?: ScanMode,
    overrideTarget?: string,
    targetLang: RoastLanguage = lang
  ) {
    const modeToUse = overrideMode ?? scanMode;
    const activeInput =
      modeToUse === "wallet"
        ? walletInput
        : modeToUse === "token"
        ? tokenInput
        : urlInput;
    const rawTarget = (overrideTarget ?? activeInput).trim();
    const activeCopy = getUiCopy(targetLang).securityGuard;

    setValidationError(null);
    setRevokeError(null);

    if (!rawTarget) {
      setValidationError(
        modeToUse === "wallet"
          ? activeCopy.emptyWalletError
          : modeToUse === "token"
          ? activeCopy.emptyTokenError
          : activeCopy.emptyUrlError
      );
      return;
    }

    if (modeToUse === "url") {
      if (!isValidHttpUrlInput(rawTarget)) {
        setValidationError(activeCopy.invalidUrlError);
        return;
      }
    } else if (!isAddress(rawTarget)) {
      setValidationError(activeCopy.invalidAddressError);
      return;
    }

    const reqId = ++activeRequestId.current;
    setIsLoading(true);
    try {
      const requestBody =
        modeToUse === "wallet"
          ? { walletAddress: rawTarget, lang: targetLang }
          : modeToUse === "token"
          ? { tokenContract: rawTarget, lang: targetLang }
          : { siteUrl: rawTarget, lang: targetLang };

      const response = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (reqId !== activeRequestId.current) return;

      if (!response.ok) {
        setValidationError(
          data.error || getUiCopy(targetLang).errors.apiFailed
        );
        return;
      }

      setScanData(data as SecurityApiResponse);
    } catch {
      if (reqId !== activeRequestId.current) return;
      setValidationError(getUiCopy(targetLang).errors.networkError);
    } finally {
      if (reqId === activeRequestId.current) {
        setIsLoading(false);
      }
    }
  }

  // Re-run analysis when toggling TH <-> EN while viewing a scan result
  useEffect(() => {
    if (scanData && scanData.lang !== lang) {
      void handleSecurityScan(scanData.mode, scanData.targetAddress, lang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function handleRevokeApproval(
    tokenAddress: string,
    spenderContract: string
  ) {
    const approvalKey = `${tokenAddress}-${spenderContract}`;
    setRevokeError(null);
    setRevokingKey(approvalKey);
    try {
      const txHash = await writeContractAsync({
        address: tokenAddress as Address,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [spenderContract as Address, BigInt(0)],
        chainId: BSC_CHAIN_ID,
      });
      setRevokedTxs((prev) => ({ ...prev, [approvalKey]: txHash }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRevokeError(msg);
    } finally {
      setRevokingKey(null);
    }
  }

  const safetyScore = scanData?.analysis.safetyScore ?? 0;
  const riskLevel = scanData?.analysis.riskLevel ?? "SAFE";
  const scoreRingClass =
    riskLevel === "DANGER"
      ? "border-rose-500/50 bg-rose-500/15 text-rose-400"
      : riskLevel === "CAUTION"
      ? "border-amber-500/50 bg-amber-500/15 text-amber-400"
      : "border-emerald-500/50 bg-emerald-500/15 text-emerald-400";

  const riskyApprovalsCount =
    scanData?.approvals.filter((a) => a.riskLevel !== "SAFE").length ?? 0;

  const flaggedSpenderReports =
    scanData?.riskySpenderReports.filter((r) => r.riskLevel !== "SAFE") ?? [];

  const isScanningConnectedOwner = Boolean(
    connectedAddress &&
      scanData?.mode === "wallet" &&
      connectedAddress.toLowerCase() === scanData.targetAddress.toLowerCase()
  );

  const activeInputValue =
    scanMode === "wallet"
      ? walletInput
      : scanMode === "token"
      ? tokenInput
      : urlInput;

  const activePlaceholder =
    scanMode === "wallet"
      ? copy.walletPlaceholder
      : scanMode === "token"
      ? copy.tokenPlaceholder
      : copy.urlPlaceholder;

  return (
    <div className="space-y-8">
      {/* Cyber-Security Scanner Input Card */}
      <section className="glass-panel relative overflow-hidden rounded-3xl border border-cyan-500/20 p-6 sm:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300">
            <Radar className="h-4 w-4 text-cyan-400" />
            <span>{copy.badge}</span>
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
            {copy.titlePrefix}
            <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
              {copy.titleHighlight}
            </span>
          </h1>

          <p className="mt-3 text-sm text-slate-300 sm:text-base">
            {copy.description}
          </p>

          {/* 3-Mode Security Switcher */}
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/80 p-1.5">
            <button
              type="button"
              onClick={() => {
                setScanMode("wallet");
                setValidationError(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                scanMode === "wallet"
                  ? "bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-500/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>{copy.modeWallet}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode("token");
                setValidationError(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                scanMode === "token"
                  ? "bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{copy.modeToken}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode("url");
                setValidationError(null);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                scanMode === "url"
                  ? "bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{copy.modeUrl}</span>
            </button>
          </div>

          {/* Search Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSecurityScan();
            }}
            className="mt-5 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={activeInputValue}
                onChange={(e) => {
                  if (scanMode === "wallet") {
                    setWalletInput(e.target.value);
                  } else if (scanMode === "token") {
                    setTokenInput(e.target.value);
                  } else {
                    setUrlInput(e.target.value);
                  }
                  if (validationError) setValidationError(null);
                }}
                placeholder={activePlaceholder}
                aria-label={activePlaceholder}
                className="w-full rounded-2xl border border-white/15 bg-slate-950/90 py-4 pl-12 pr-4 font-mono text-sm text-white placeholder-slate-500 shadow-inner focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 px-7 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{copy.scanLoading}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
                  <span>{copy.scanIdle}</span>
                </>
              )}
            </button>
          </form>

          {/* Error Banner */}
          {validationError && (
            <div
              role="alert"
              className="mt-4 flex items-start justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-left text-xs font-medium text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span className="break-all">{validationError}</span>
            </div>
          )}

          {/* Quick Presets / Connected Wallet Pill */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            {scanMode === "wallet" && (
              <>
                {isConnected && connectedAddress && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setWalletInput(connectedAddress);
                      void handleSecurityScan("wallet", connectedAddress, lang);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>{copy.useConnectedWallet}</span>
                  </button>
                )}
                <span className="text-slate-400">{copy.presetWalletLabel}</span>
                {SAMPLE_BSC_WALLETS.map((sample) => (
                  <button
                    key={sample.address}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setWalletInput(sample.address);
                      void handleSecurityScan("wallet", sample.address, lang);
                    }}
                    className="rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 font-medium text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    {sample.label}
                  </button>
                ))}
              </>
            )}

            {scanMode === "token" && (
              <>
                <span className="text-slate-400">{copy.presetTokenLabel}</span>
                {SAMPLE_BSC_TOKENS.map((tok) => (
                  <button
                    key={tok.address}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setTokenInput(tok.address);
                      void handleSecurityScan("token", tok.address, lang);
                    }}
                    className="rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 font-medium text-slate-300 transition hover:border-amber-400/50 hover:text-amber-300"
                  >
                    {tok.label}
                  </button>
                ))}
              </>
            )}

            {scanMode === "url" && (
              <>
                <span className="text-slate-400">{copy.presetUrlLabel}</span>
                {SAMPLE_SECURITY_URLS.map((site) => (
                  <button
                    key={site.url}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      setUrlInput(site.url);
                      void handleSecurityScan("url", site.url, lang);
                    }}
                    className="rounded-lg border border-white/10 bg-slate-900/80 px-2.5 py-1 font-medium text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300"
                  >
                    {site.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Scan Results */}
      {scanData && (
        <div
          className={`space-y-6 transition-opacity ${
            isLoading ? "opacity-60" : "opacity-100"
          }`}
        >
          {/* Free Tier Overview Card */}
          <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              {/* Left: AI Security Summary */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${getRiskBadgeStyle(
                      scanData.analysis.riskLevel
                    )}`}
                  >
                    {scanData.analysis.riskLevel === "DANGER" ? (
                      <Skull className="h-3.5 w-3.5" />
                    ) : scanData.analysis.riskLevel === "CAUTION" ? (
                      <ShieldAlert className="h-3.5 w-3.5" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5" />
                    )}
                    {copy.riskLevels[scanData.analysis.riskLevel]}
                  </span>

                  <span className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 font-mono text-xs text-slate-300">
                    {scanData.mode === "url"
                      ? `URL: ${
                          scanData.phishingReport?.hostname ??
                          scanData.targetAddress
                        }`
                      : `${
                          scanData.mode === "wallet" ? "Wallet" : "Contract"
                        }: ${scanData.targetAddress.slice(
                          0,
                          8
                        )}...${scanData.targetAddress.slice(-6)}`}
                  </span>

                  {isLoading && scanData.lang !== lang && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {copy.switchingLang}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    {copy.aiDoctorLabel}
                  </p>
                  <blockquote className="mt-2 rounded-2xl border border-white/10 bg-slate-950/75 p-5 text-sm leading-relaxed text-slate-200 sm:text-base">
                    {scanData.analysis.plainEnglishSummary}
                  </blockquote>
                </div>
              </div>

              {/* Right: Safety Score Gauge */}
              <div
                className={`flex shrink-0 flex-col items-center justify-center rounded-3xl border-2 p-6 text-center lg:h-52 lg:w-52 ${scoreRingClass}`}
              >
                <span className="text-xs font-bold uppercase tracking-widest opacity-85">
                  {copy.safetyScoreLabel}
                </span>
                <span className="mt-1 text-6xl font-black tracking-tighter">
                  {safetyScore}
                </span>
                <span className="text-xs font-semibold opacity-75">
                  {copy.outOf100}
                </span>
                <div className="mt-3 h-2 w-36 overflow-hidden rounded-full bg-slate-950/80">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      riskLevel === "DANGER"
                        ? "bg-rose-400"
                        : riskLevel === "CAUTION"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                    style={{ width: `${safetyScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Telemetry Counters */}
            {scanData.mode === "url" && scanData.phishingReport ? (
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.siteContractsScanned}
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-white">
                    {scanData.phishingReport.websiteContractsScanned}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.maliciousContracts}
                  </p>
                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      scanData.phishingReport.maliciousContractsCount > 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {scanData.phishingReport.maliciousContractsCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.auditReports}
                  </p>
                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      scanData.phishingReport.audits.length > 0
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {scanData.phishingReport.audits.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.urlFlagsCount}
                  </p>
                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      scanData.phishingReport.riskFlags.length > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {scanData.phishingReport.riskFlags.length}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.tokensScanned}
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-white">
                    {scanData.scannedTokens.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.flaggedTokens}
                  </p>
                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      scanData.analysis.flaggedTokens.length > 0
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {scanData.analysis.flaggedTokens.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.activeApprovals}
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold text-white">
                    {scanData.approvals.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs text-slate-400">
                    {copy.stats.riskyApprovals}
                  </p>
                  <p
                    className={`mt-1 font-mono text-xl font-bold ${
                      riskyApprovalsCount > 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {riskyApprovalsCount}
                  </p>
                </div>
              </div>
            )}

            {/* Phishing Site & dApp Verification Card (URL Mode) */}
            {scanData.mode === "url" && scanData.phishingReport && (
              <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <span>{copy.phishingCard.title}</span>
                  </h3>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                      scanData.phishingReport.isPhishingSite
                        ? "border-rose-500/50 bg-rose-500/20 text-rose-300"
                        : scanData.phishingReport.isTrustedDapp
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {scanData.phishingReport.isPhishingSite
                      ? copy.phishingCard.phishingBadge
                      : scanData.phishingReport.isTrustedDapp
                      ? copy.phishingCard.verifiedBadge
                      : copy.phishingCard.unverifiedBadge}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-300">
                    <span>
                      {copy.phishingCard.hostname}{" "}
                      <strong className="font-mono text-white">
                        {scanData.phishingReport.hostname}
                      </strong>
                    </span>
                    <span>
                      {copy.phishingCard.projectName}{" "}
                      <strong className="text-white">
                        {scanData.phishingReport.projectName ||
                          copy.phishingCard.unknownProject}
                      </strong>
                    </span>
                    {scanData.phishingReport.isTrustedDapp && (
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                        {copy.phishingCard.trustListYes}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-slate-300">
                    <span>{copy.phishingCard.auditsLabel}</span>
                    {scanData.phishingReport.audits.length === 0 ? (
                      <span className="text-amber-300">
                        {copy.phishingCard.noAudits}
                      </span>
                    ) : (
                      scanData.phishingReport.audits.map((audit, aIdx) =>
                        audit.link ? (
                          <a
                            key={`${audit.firm}-${aIdx}`}
                            href={audit.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300 hover:underline"
                          >
                            <span>
                              {audit.firm}
                              {audit.time ? ` (${audit.time})` : ""}
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span
                            key={`${audit.firm}-${aIdx}`}
                            className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-300"
                          >
                            {audit.firm}
                          </span>
                        )
                      )
                    )}
                  </div>

                  {scanData.phishingReport.riskFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scanData.phishingReport.riskFlags.map((flag) => (
                        <span
                          key={flag}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getFlagChipStyle(
                            flag
                          )}`}
                        >
                          {copy.flagLabels[flag] ?? flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Malicious Address & Drainer Reputation Banner (Wallet / Token Modes) */}
            {scanData.addressSecurity && (
              <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Radar className="h-4 w-4 text-cyan-400" />
                  <span>{copy.addressRep.title}</span>
                </h3>

                <div
                  className={`rounded-2xl border p-4 text-xs ${
                    scanData.addressSecurity.riskLevel === "DANGER"
                      ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                      : scanData.addressSecurity.riskLevel === "CAUTION"
                      ? "border-amber-500/40 bg-amber-950/25 text-amber-200"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      {scanData.addressSecurity.riskLevel === "SAFE" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                      )}
                      <span>
                        {scanData.addressSecurity.riskLevel === "SAFE"
                          ? copy.addressRep.cleanLabel
                          : copy.addressRep.riskyLabel}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] opacity-80">
                      {copy.addressRep.sourceLabel}{" "}
                      {scanData.addressSecurity.dataSource}
                    </span>
                  </div>

                  {scanData.addressSecurity.threatFlags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {scanData.addressSecurity.threatFlags.map((flag) => (
                        <span
                          key={flag}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getFlagChipStyle(
                            flag
                          )}`}
                        >
                          {copy.flagLabels[flag] ?? flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {flaggedSpenderReports.length > 0 && (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-950/25 p-4 text-xs">
                    <p className="font-bold text-rose-300">
                      {copy.addressRep.riskySpendersTitle}
                    </p>
                    <div className="mt-2 space-y-2">
                      {flaggedSpenderReports.map((sp) => (
                        <div
                          key={sp.address}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/25 bg-slate-950/70 px-3 py-2"
                        >
                          <span className="font-mono text-slate-200">
                            {sp.address}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {sp.threatFlags.map((flag) => (
                              <span
                                key={flag}
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getFlagChipStyle(
                                  flag
                                )}`}
                              >
                                {copy.flagLabels[flag] ?? flag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flagged AI Reasons (Free Tier) */}
            {scanData.analysis.flaggedTokens.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span>{copy.flaggedTitle}</span>
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {scanData.analysis.flaggedTokens.map((item, idx) => (
                    <div
                      key={`${item.contractAddress}-${idx}`}
                      className={`rounded-2xl border p-4 ${
                        item.severity === "DANGER"
                          ? "border-rose-500/35 bg-rose-950/25"
                          : "border-amber-500/35 bg-amber-950/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          {item.symbol}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getRiskBadgeStyle(
                            item.severity
                          )}`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {item.contractAddress}
                      </p>
                      <ul className="mt-2.5 space-y-1 text-xs text-slate-200">
                        {item.reasons.map((reason, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Free Tier Scanned Token Cards (Wallet / Token Modes) */}
            {scanData.mode !== "url" && (
              <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                <h3 className="text-sm font-bold text-white">
                  {copy.scannedTokensTitle}
                </h3>

                {scanData.scannedTokens.length === 0 ? (
                  <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                    {copy.noTokensFound}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {scanData.scannedTokens.map((tok: TokenSecurityReport) => (
                      <div
                        key={tok.contractAddress}
                        className="rounded-2xl border border-white/10 bg-slate-950/65 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-extrabold text-white">
                                ${tok.tokenSymbol}
                              </span>
                              <span className="text-xs text-slate-400">
                                {tok.tokenName}
                              </span>
                            </div>
                            <a
                              href={`https://bscscan.com/token/${tok.contractAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-cyan-300 hover:underline"
                            >
                              <span>
                                {tok.contractAddress.slice(0, 10)}...
                                {tok.contractAddress.slice(-8)}
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              tok.isHoneypot
                                ? "border-rose-500/50 bg-rose-500/20 text-rose-300"
                                : getRiskBadgeStyle(tok.severity)
                            }`}
                          >
                            {tok.isHoneypot ? copy.honeypotYes : copy.honeypotNo}
                          </span>
                        </div>

                        {/* Basic Tax Row */}
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
                          <span>
                            {copy.buyTax}:{" "}
                            <strong
                              className={`font-mono ${
                                tok.buyTaxPercent >= 10
                                  ? "text-rose-400"
                                  : tok.buyTaxPercent >= 5
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {tok.buyTaxPercent}%
                            </strong>
                          </span>
                          <span>
                            {copy.sellTax}:{" "}
                            <strong
                              className={`font-mono ${
                                tok.sellTaxPercent >= 10
                                  ? "text-rose-400"
                                  : tok.sellTaxPercent >= 5
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {tok.sellTaxPercent}%
                            </strong>
                          </span>
                          {tok.isTrustList && (
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                              {copy.trustedBadge}
                            </span>
                          )}
                        </div>

                        {/* Color-coded Risk Badges */}
                        {tok.riskFlags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tok.riskFlags.map((flag) => (
                              <span
                                key={flag}
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getFlagChipStyle(
                                  flag
                                )}`}
                              >
                                {copy.flagLabels[flag] ?? flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* $COAI Token-Gated Pro Section: Deep Contract Audit + Approvals + Revoke */}
          <div className="glass-panel-amber relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isProUnlocked
                      ? "border border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                      : "border border-amber-500/40 bg-amber-500/20 text-amber-400"
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
                    <h3 className="text-lg font-bold text-white">
                      {copy.proAudit.title}
                    </h3>
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                      {copy.proAudit.vipBadge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {copy.proAudit.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2 text-xs">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="text-slate-400">{copy.proAudit.required}</span>
                <span className="font-mono font-bold text-white">
                  {COAI_THRESHOLD} $COAI
                </span>
                {isConnected && (
                  <>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">{copy.proAudit.yours}</span>
                    <span
                      className={`font-mono font-bold ${
                        isProUnlocked ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {isBalanceLoading
                        ? copy.proAudit.checking
                        : `${formattedCoaiBalance.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })} $COAI`}
                    </span>
                  </>
                )}
              </div>
            </div>

            {isProUnlocked ? (
              <div className="mt-6 space-y-7">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                  <span>{copy.proAudit.unlockedBanner}</span>
                </div>

                {/* 1. Deep Contract Audit Matrix */}
                {scanData.scannedTokens.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white">
                      {copy.proAudit.matrixTitle}
                    </h4>
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/75">
                      <table className="min-w-full divide-y divide-white/10 text-left text-xs">
                        <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-3">
                              {copy.proAudit.headers.token}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.openSource}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.honeypot}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.taxes}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.mintable}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.hiddenOwner}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.takeback}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.blacklist}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.trust}
                            </th>
                            <th className="px-3 py-3">
                              {copy.proAudit.headers.holders}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-slate-200">
                          {scanData.scannedTokens.map((tok) => (
                            <tr
                              key={tok.contractAddress}
                              className="hover:bg-white/5"
                            >
                              <td className="px-4 py-3 font-mono font-bold text-white">
                                ${tok.tokenSymbol}
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.isOpenSource}
                                  goodWhenTrue={true}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.isHoneypot}
                                  goodWhenTrue={false}
                                />
                              </td>
                              <td className="px-3 py-3 font-mono">
                                {tok.buyTaxPercent}% / {tok.sellTaxPercent}%
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.isMintable}
                                  goodWhenTrue={false}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.hiddenOwner}
                                  goodWhenTrue={false}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.canTakeBackOwnership}
                                  goodWhenTrue={false}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.isBlacklisted}
                                  goodWhenTrue={false}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <AuditBooleanCell
                                  value={tok.isTrustList}
                                  goodWhenTrue={true}
                                />
                              </td>
                              <td className="px-3 py-3 font-mono text-slate-300">
                                {tok.holderCount !== null
                                  ? tok.holderCount.toLocaleString()
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 2. Active Approvals & One-Click Revoke (Wallet Mode) */}
                {scanData.mode === "wallet" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white">
                        {copy.proAudit.approvalsTitle}
                      </h4>
                      {!isScanningConnectedOwner &&
                        scanData.approvals.length > 0 && (
                          <span className="text-[11px] text-amber-300">
                            {copy.proAudit.connectOwnerToRevoke}
                          </span>
                        )}
                    </div>

                    {revokeError && (
                      <div
                        role="alert"
                        className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-xs text-rose-200"
                      >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        <span className="break-all">{revokeError}</span>
                      </div>
                    )}

                    {scanData.approvals.length === 0 ? (
                      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                        {copy.proAudit.noApprovals}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {scanData.approvals.map((app) => {
                          const key = `${app.tokenAddress}-${app.spenderContract}`;
                          const txHash = revokedTxs[key];
                          const isRevoking = revokingKey === key;

                          return (
                            <div
                              key={key}
                              className="flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/75 p-4 sm:flex-row sm:items-center"
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-white">
                                    ${app.tokenSymbol}
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getRiskBadgeStyle(
                                      app.riskLevel
                                    )}`}
                                  >
                                    {app.riskLevel}
                                  </span>
                                  {app.isUnlimited && (
                                    <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                      {copy.proAudit.unlimited}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-300">
                                  Spender:{" "}
                                  <span className="font-semibold text-white">
                                    {app.spenderName ||
                                      app.spenderTag ||
                                      copy.proAudit.spenderUnknown}
                                  </span>{" "}
                                  <span className="font-mono text-[11px] text-slate-400">
                                    ({app.spenderContract.slice(0, 8)}...
                                    {app.spenderContract.slice(-6)})
                                  </span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {txHash ? (
                                  <a
                                    href={`https://bscscan.com/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 hover:underline"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>
                                      {copy.proAudit.revokedSuccess}{" "}
                                      {txHash.slice(0, 8)}...
                                    </span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={
                                      !isScanningConnectedOwner || isRevoking
                                    }
                                    onClick={() =>
                                      void handleRevokeApproval(
                                        app.tokenAddress,
                                        app.spenderContract
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    {isRevoking ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>{copy.proAudit.revokingBtn}</span>
                                      </>
                                    ) : (
                                      <span>{copy.proAudit.revokeBtn}</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. AI Remediation & Approval Revoke Checklist */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white">
                    {copy.proAudit.remediationTitle}
                  </h4>
                  <ul className="space-y-2.5">
                    {scanData.analysis.proRemediationSteps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-slate-950/60 p-4 text-sm text-slate-200"
                      >
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="relative mt-6">
                {/* Blurred Teaser Preview */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none select-none space-y-3 blur-[6px] opacity-40"
                >
                  {scanData.analysis.proRemediationSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                {/* Lock Overlay CTA */}
                <div className="inset-0 flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-slate-950/85 p-6 text-center backdrop-blur-md sm:absolute">
                  <Lock className="mb-2 h-7 w-7 text-amber-400" />
                  <h4 className="text-base font-bold text-white">
                    {!isConnected
                      ? copy.proAudit.connectHeading
                      : copy.proAudit.holdHeading(COAI_THRESHOLD)}
                  </h4>
                  <p className="mt-1 max-w-md text-xs text-slate-300">
                    {copy.proAudit.lockDescPre}
                    <span className="font-semibold text-amber-300">
                      BNB Smart Chain (Chain ID 56)
                    </span>
                    {copy.proAudit.lockDescMid}
                    <span className="font-mono font-semibold text-emerald-300">
                      {COAI_THRESHOLD}+ $COAI
                    </span>
                    {copy.proAudit.lockDescPost}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                    {!isConnected ? (
                      <ConnectButton label={copy.proAudit.connectBtnLabel} />
                    ) : (
                      <a
                        href={`https://pancakeswap.finance/swap?outputCurrency=${COAI_TOKEN_ADDRESS}&chain=bsc`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                      >
                        <span>{copy.proAudit.buyCoai}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <a
                      href={`https://bscscan.com/token/${COAI_TOKEN_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-amber-400/50 hover:text-white"
                    >
                      <span>{copy.proAudit.contractLink}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
