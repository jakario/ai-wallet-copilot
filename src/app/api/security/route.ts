import { NextResponse } from "next/server";
import {
  SecurityApiResponseSchema,
  SecurityScanRequestSchema,
} from "@/lib/schemas";
import { fetchRecentWalletTokenContracts } from "@/lib/moralis";
import {
  scanAddressSecurityWithGoPlus,
  scanPhishingSiteWithGoPlus,
  scanTokensWithGoPlus,
  scanWalletApprovalsWithGoPlus,
} from "@/lib/goplus";
import { analyzeSecurityRisks } from "@/lib/security-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const parsedReq = SecurityScanRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      const validationMsg =
        parsedReq.error.issues[0]?.message ||
        "Please provide a valid BNB Smart Chain wallet, token contract, or website URL to scan.";
      console.error("[API /api/security] Validation Error:", validationMsg);
      return NextResponse.json({ error: validationMsg }, { status: 400 });
    }

    const { walletAddress, tokenContract, siteUrl, lang } = parsedReq.data;

    if (siteUrl) {
      // Phishing URL & dApp Security Scan Mode
      const phishingReport = await scanPhishingSiteWithGoPlus(siteUrl);

      const analysis = await analyzeSecurityRisks({
        mode: "url",
        targetAddress: phishingReport.url,
        tokens: [],
        approvals: [],
        addressSecurity: null,
        riskySpenderReports: [],
        phishingReport,
        lang,
      });

      const payload = SecurityApiResponseSchema.parse({
        mode: "url",
        targetAddress: phishingReport.url,
        lang,
        scannedTokens: [],
        approvals: [],
        addressSecurity: null,
        riskySpenderReports: [],
        phishingReport,
        analysis,
        generatedAt: new Date().toISOString(),
      });

      return NextResponse.json(payload, { status: 200 });
    }

    if (tokenContract) {
      // Single BEP-20 Token Contract DYOR Scan + Address Threat Check
      const [scannedTokens, addressSecurity] = await Promise.all([
        scanTokensWithGoPlus([tokenContract]),
        scanAddressSecurityWithGoPlus(tokenContract),
      ]);

      if (scannedTokens.length === 0) {
        const notFoundMsg = `No BEP-20 token contract security data found on GoPlus for ${tokenContract}. Verify it is a valid BNB Smart Chain token contract.`;
        console.error("[API /api/security] Token Not Found:", notFoundMsg);
        return NextResponse.json({ error: notFoundMsg }, { status: 404 });
      }

      const analysis = await analyzeSecurityRisks({
        mode: "token",
        targetAddress: tokenContract,
        tokens: scannedTokens,
        approvals: [],
        addressSecurity,
        riskySpenderReports: [],
        phishingReport: null,
        lang,
      });

      const payload = SecurityApiResponseSchema.parse({
        mode: "token",
        targetAddress: tokenContract,
        lang,
        scannedTokens,
        approvals: [],
        addressSecurity,
        riskySpenderReports: [],
        phishingReport: null,
        analysis,
        generatedAt: new Date().toISOString(),
      });

      return NextResponse.json(payload, { status: 200 });
    }

    // Wallet Mode: Recent BEP-20 Contracts (Alchemy) + Approvals (GoPlus v2) + Address Threat + Untrusted Spenders
    const targetWallet = walletAddress!;
    const [recentContracts, approvals, addressSecurity] = await Promise.all([
      fetchRecentWalletTokenContracts(targetWallet, 15),
      scanWalletApprovalsWithGoPlus(targetWallet),
      scanAddressSecurityWithGoPlus(targetWallet),
    ]);

    const mergedContracts = Array.from(
      new Set([
        ...recentContracts,
        ...approvals.map((item) => item.tokenAddress.toLowerCase()),
      ])
    ).slice(0, 20);

    const untrustedSpenders = Array.from(
      new Set(
        approvals
          .filter((item) => !item.isSpenderTrusted)
          .map((item) => item.spenderContract.toLowerCase())
      )
    ).slice(0, 5);

    const [scannedTokens, riskySpenderReports] = await Promise.all([
      mergedContracts.length > 0
        ? scanTokensWithGoPlus(mergedContracts)
        : Promise.resolve([]),
      untrustedSpenders.length > 0
        ? Promise.all(untrustedSpenders.map(scanAddressSecurityWithGoPlus))
        : Promise.resolve([]),
    ]);

    const analysis = await analyzeSecurityRisks({
      mode: "wallet",
      targetAddress: targetWallet,
      tokens: scannedTokens,
      approvals,
      addressSecurity,
      riskySpenderReports,
      phishingReport: null,
      lang,
    });

    const payload = SecurityApiResponseSchema.parse({
      mode: "wallet",
      targetAddress: targetWallet,
      lang,
      scannedTokens,
      approvals,
      addressSecurity,
      riskySpenderReports,
      phishingReport: null,
      analysis,
      generatedAt: new Date().toISOString(),
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (err: unknown) {
    const exactMessage = err instanceof Error ? err.message : String(err);
    console.error("[API /api/security] Execution failed:", err);
    return NextResponse.json({ error: exactMessage }, { status: 500 });
  }
}
