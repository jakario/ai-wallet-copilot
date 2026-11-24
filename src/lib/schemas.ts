import { z } from "zod";
import { isAddress } from "viem";

export const RoastLanguageSchema = z.enum(["th", "en"]).default("th");
export type RoastLanguage = z.infer<typeof RoastLanguageSchema>;

export const RoastRequestSchema = z.object({
  address: z
    .string()
    .trim()
    .refine((val) => isAddress(val), {
      message: "Invalid BNB Smart Chain (0x...) wallet address.",
    }),
  lang: RoastLanguageSchema.optional().default("th"),
});

export const WalletActivitySummarySchema = z.object({
  address: z.string(),
  chain: z.literal("BNB Smart Chain (BSC)"),
  periodDays: z.number(),
  nativeBnbBalance: z.string(),
  txCount30d: z.number(),
  tokenTransferCount30d: z.number(),
  totalGasSpentBnb: z.string(),
  topInteractedTokens: z.array(
    z.object({
      symbol: z.string(),
      count: z.number(),
    })
  ),
  inflowCount: z.number(),
  outflowCount: z.number(),
  winLossPattern: z.string(),
  isEmptyOrNewWallet: z.boolean(),
  dataSource: z.literal("alchemy"),
});

export const GeminiRoastOutputSchema = z.object({
  roast: z
    .string()
    .min(15)
    .describe(
      "A witty, brutal, yet insightful 3-4 sentence roast of the wallet's trading habits."
    ),
  degenScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe(
      "Degen Score from 0 (terrified normie) to 100 (full leverage memecoin ape)."
    ),
  archetype: z
    .string()
    .min(2)
    .max(90)
    .describe(
      "Funny Trader Archetype title, e.g., 'เจ้าพ่อถวายค่าแก๊ส' or 'Gas Fee Philanthropist'."
    ),
  proAdvice: z
    .array(z.string())
    .length(3)
    .describe(
      "3 bullet points of actionable trading advice (locked behind $COAI Token-Gating)."
    ),
});

export const RoastApiResponseSchema = z.object({
  summary: WalletActivitySummarySchema,
  result: GeminiRoastOutputSchema,
  lang: RoastLanguageSchema,
  generatedAt: z.string(),
});

// ============================================================================
// Phase 2: Wallet Security Guard v2 (GoPlus Token, Approval, Address & URL + AI)
// ============================================================================

export const RiskLevelSchema = z.enum(["SAFE", "CAUTION", "DANGER"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const SecurityScanRequestSchema = z
  .object({
    walletAddress: z.string().trim().optional(),
    tokenContract: z.string().trim().optional(),
    siteUrl: z.string().trim().optional(),
    lang: RoastLanguageSchema.optional().default("th"),
  })
  .superRefine((data, ctx) => {
    const hasWallet = Boolean(data.walletAddress);
    const hasToken = Boolean(data.tokenContract);
    const hasUrl = Boolean(data.siteUrl);

    if (!hasWallet && !hasToken && !hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide a walletAddress, tokenContract (0x...), or siteUrl to scan.",
      });
      return;
    }

    if (data.walletAddress && !isAddress(data.walletAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["walletAddress"],
        message: "Invalid BNB Smart Chain wallet address (0x...).",
      });
    }

    if (data.tokenContract && !isAddress(data.tokenContract)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tokenContract"],
        message:
          "Invalid BNB Smart Chain BEP-20 token contract address (0x...).",
      });
    }

    if (data.siteUrl) {
      const normalized = /^https?:\/\//i.test(data.siteUrl)
        ? data.siteUrl
        : `https://${data.siteUrl}`;
      try {
        const parsed = new URL(normalized);
        const validProto =
          parsed.protocol === "http:" || parsed.protocol === "https:";
        if (!validProto || !parsed.hostname.includes(".")) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["siteUrl"],
            message:
              "Invalid website URL. Provide a valid domain such as https://pancakeswap.finance.",
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["siteUrl"],
          message:
            "Invalid website URL. Provide a valid domain such as https://pancakeswap.finance.",
        });
      }
    }
  });

export const TokenSecurityReportSchema = z.object({
  contractAddress: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  isHoneypot: z.boolean(),
  buyTaxPercent: z.number(),
  sellTaxPercent: z.number(),
  isOpenSource: z.boolean(),
  isMintable: z.boolean(),
  canTakeBackOwnership: z.boolean(),
  hiddenOwner: z.boolean(),
  isBlacklisted: z.boolean(),
  isTrustList: z.boolean(),
  isProxy: z.boolean(),
  cannotSellAll: z.boolean(),
  honeypotWithSameCreator: z.boolean(),
  holderCount: z.number().nullable(),
  isInDex: z.boolean(),
  riskFlags: z.array(z.string()),
  severity: RiskLevelSchema,
});

export const ApprovalRiskItemSchema = z.object({
  tokenAddress: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  balance: z.string(),
  isTokenOpenSource: z.boolean(),
  isTokenMalicious: z.boolean(),
  spenderContract: z.string(),
  spenderName: z.string().nullable(),
  spenderTag: z.string().nullable(),
  approvedAmount: z.string(),
  isUnlimited: z.boolean(),
  isSpenderContract: z.boolean(),
  isSpenderOpenSource: z.boolean(),
  isSpenderTrusted: z.boolean(),
  isSpenderDoubtful: z.boolean(),
  maliciousBehaviors: z.array(z.string()),
  approvedTime: z.number().nullable(),
  riskLevel: RiskLevelSchema,
});

export const AddressSecurityReportSchema = z.object({
  address: z.string(),
  isPhishing: z.boolean(),
  isStealingAttack: z.boolean(),
  isHoneypotRelated: z.boolean(),
  isCybercrime: z.boolean(),
  isMoneyLaundering: z.boolean(),
  isFinancialCrime: z.boolean(),
  isBlackmail: z.boolean(),
  isSanctioned: z.boolean(),
  isBlacklistDoubt: z.boolean(),
  isFakeToken: z.boolean(),
  isMixer: z.boolean(),
  maliciousContractsCreated: z.number().int().min(0),
  dataSource: z.string(),
  threatFlags: z.array(z.string()),
  riskLevel: RiskLevelSchema,
});

export const PhishingSiteReportSchema = z.object({
  url: z.string(),
  hostname: z.string(),
  isPhishingSite: z.boolean(),
  isRegisteredDapp: z.boolean(),
  projectName: z.string().nullable(),
  isAudited: z.boolean(),
  isTrustedDapp: z.boolean(),
  audits: z.array(
    z.object({
      firm: z.string(),
      time: z.string().nullable(),
      link: z.string().nullable(),
    })
  ),
  maliciousContractsCount: z.number().int().min(0),
  websiteContractsScanned: z.number().int().min(0),
  riskFlags: z.array(z.string()),
  riskLevel: RiskLevelSchema,
});

export const FlaggedTokenSchema = z.object({
  symbol: z.string(),
  contractAddress: z.string(),
  severity: z.enum(["CAUTION", "DANGER"]),
  reasons: z.array(z.string()).min(1),
});

export const AiSecurityAnalysisSchema = z.object({
  safetyScore: z.number().int().min(0).max(100),
  riskLevel: RiskLevelSchema,
  plainEnglishSummary: z.string().min(15),
  flaggedTokens: z.array(FlaggedTokenSchema),
  proRemediationSteps: z.array(z.string()).min(2).max(6),
});

export const SecurityApiResponseSchema = z.object({
  mode: z.enum(["wallet", "token", "url"]),
  targetAddress: z.string(),
  lang: RoastLanguageSchema,
  scannedTokens: z.array(TokenSecurityReportSchema),
  approvals: z.array(ApprovalRiskItemSchema),
  addressSecurity: AddressSecurityReportSchema.nullable(),
  riskySpenderReports: z.array(AddressSecurityReportSchema),
  phishingReport: PhishingSiteReportSchema.nullable(),
  analysis: AiSecurityAnalysisSchema,
  generatedAt: z.string(),
});

export type RoastRequest = z.infer<typeof RoastRequestSchema>;
export type WalletActivitySummary = z.infer<typeof WalletActivitySummarySchema>;
export type GeminiRoastOutput = z.infer<typeof GeminiRoastOutputSchema>;
export type RoastApiResponse = z.infer<typeof RoastApiResponseSchema>;

export type SecurityScanRequest = z.infer<typeof SecurityScanRequestSchema>;
export type TokenSecurityReport = z.infer<typeof TokenSecurityReportSchema>;
export type ApprovalRiskItem = z.infer<typeof ApprovalRiskItemSchema>;
export type AddressSecurityReport = z.infer<typeof AddressSecurityReportSchema>;
export type PhishingSiteReport = z.infer<typeof PhishingSiteReportSchema>;
export type FlaggedToken = z.infer<typeof FlaggedTokenSchema>;
export type AiSecurityAnalysis = z.infer<typeof AiSecurityAnalysisSchema>;
export type SecurityApiResponse = z.infer<typeof SecurityApiResponseSchema>;
