import "server-only";
import { isAddress } from "viem";
import type {
  AddressSecurityReport,
  ApprovalRiskItem,
  PhishingSiteReport,
  RiskLevel,
  TokenSecurityReport,
} from "./schemas";

const GOPLUS_TOKEN_SECURITY_URL =
  "https://api.gopluslabs.io/api/v1/token_security/56";
const GOPLUS_APPROVAL_SECURITY_URL =
  "https://api.gopluslabs.io/api/v2/token_approval_security/56";
const GOPLUS_ADDRESS_SECURITY_URL =
  "https://api.gopluslabs.io/api/v1/address_security";
const GOPLUS_PHISHING_SITE_URL =
  "https://api.gopluslabs.io/api/v1/phishing_site";
const GOPLUS_DAPP_SECURITY_URL =
  "https://api.gopluslabs.io/api/v1/dapp_security";

const BRAND_LOOKALIKE_KEYWORDS = [
  "pancakeswap",
  "binance",
  "metamask",
  "trustwallet",
  "uniswap",
  "chainopera",
  "coai",
  "bnbchain",
  "airdrop",
  "claim",
  "reward",
  "connect-wallet",
  "revoke",
];

const OFFICIAL_WEB3_DOMAINS = [
  "pancakeswap.finance",
  "binance.com",
  "metamask.io",
  "trustwallet.com",
  "uniswap.org",
  "chainopera.ai",
  "bnbchain.org",
  "revoke.cash",
];

interface GoPlusTokenSecurityRaw {
  token_name?: string;
  token_symbol?: string;
  is_honeypot?: string | number;
  buy_tax?: string | number;
  sell_tax?: string | number;
  is_open_source?: string | number;
  is_mintable?: string | number;
  can_take_back_ownership?: string | number;
  hidden_owner?: string | number;
  is_blacklisted?: string | number;
  trust_list?: string | number;
  is_proxy?: string | number;
  cannot_sell_all?: string | number;
  honeypot_with_same_creator?: string | number;
  holder_count?: string | number;
  is_in_dex?: string | number;
}

interface GoPlusTokenSecurityResponse {
  code: number;
  message?: string;
  result?: Record<string, GoPlusTokenSecurityRaw> | null;
}

interface GoPlusApprovalAddressInfo {
  contract_name?: string | null;
  tag?: string | null;
  is_contract?: number | string;
  doubt_list?: number | string;
  malicious_behavior?: string[] | null;
  trust_list?: number | string;
  is_open_source?: number | string;
}

interface GoPlusApprovedSpenderRaw {
  approved_contract?: string;
  approved_amount?: string;
  approved_time?: number;
  address_info?: GoPlusApprovalAddressInfo | null;
}

interface GoPlusApprovalTokenRaw {
  token_address?: string;
  token_name?: string;
  token_symbol?: string;
  balance?: string;
  is_open_source?: number | string;
  malicious_address?: number | string;
  malicious_behavior?: string[] | null;
  approved_list?: GoPlusApprovedSpenderRaw[] | null;
}

interface GoPlusApprovalSecurityResponse {
  code: number;
  message?: string;
  result?: GoPlusApprovalTokenRaw[] | null;
}

interface GoPlusAddressSecurityRaw {
  cybercrime?: string | number;
  money_laundering?: string | number;
  number_of_malicious_contracts_created?: string | number;
  gas_abuse?: string | number;
  financial_crime?: string | number;
  darkweb_transactions?: string | number;
  phishing_activities?: string | number;
  fake_kyc?: string | number;
  blacklist_doubt?: string | number;
  data_source?: string;
  stealing_attack?: string | number;
  blackmail_activities?: string | number;
  sanctioned?: string | number;
  malicious_mining_activities?: string | number;
  mixer?: string | number;
  fake_token?: string | number;
  honeypot_related_address?: string | number;
}

interface GoPlusAddressSecurityResponse {
  code: number;
  message?: string;
  result?: GoPlusAddressSecurityRaw | null;
}

interface GoPlusWebsiteContractRaw {
  contract?: string;
  address_risk?: unknown[] | null;
}

interface GoPlusPhishingSiteResponse {
  code: number;
  message?: string;
  result?: {
    phishing_site?: number | string;
    website_contract_security?: GoPlusWebsiteContractRaw[] | null;
  } | null;
}

interface GoPlusDappAuditRaw {
  audit_firm?: string | null;
  audit_time?: string | null;
  audit_link?: string | null;
}

interface GoPlusDappContractRaw {
  contract_address?: string;
  malicious_contract?: number | string;
  malicious_creator?: number | string;
  malicious_behavior?: unknown[] | null;
}

interface GoPlusDappSecurityResponse {
  code: number;
  message?: string;
  result?: {
    project_name?: string | null;
    url?: string | null;
    is_audit?: number | string;
    trust_list?: number | string;
    audit_info?: GoPlusDappAuditRaw[] | null;
    contracts_security?:
      | {
          chain_id?: string;
          contracts?: GoPlusDappContractRaw[] | null;
        }[]
      | null;
  } | null;
}

function isGoPlusFlagTrue(val: string | number | boolean | undefined): boolean {
  return val === "1" || val === 1 || val === true;
}

function parseTaxPercent(val: string | number | undefined): number {
  if (val === undefined || val === null || val === "") return 0;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(100, Number((num * 100).toFixed(2)));
}

function isUnlimitedAllowance(amountStr: string): boolean {
  const normalized = amountStr.trim().toLowerCase();
  if (normalized === "unlimited") return true;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 1e30;
}

async function fetchGoPlusJson<T extends { code: number; message?: string }>(
  url: string,
  label: string,
  allowedNonOneCodes: number[] = []
): Promise<T> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const errMsg = `[GoPlus ${label} HTTP ${res.status}] ${
      bodyText || res.statusText
    }`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const payload = (await res.json()) as T;
  if (payload.code !== 1 && !allowedNonOneCodes.includes(payload.code)) {
    const errMsg = `[GoPlus ${label} Error] code=${payload.code}: ${
      payload.message || JSON.stringify(payload)
    }`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return payload;
}

/**
 * Scans BEP-20 token contracts on BNB Smart Chain (chain_id: 56) via GoPlus Token Security v1 API.
 */
export async function scanTokensWithGoPlus(
  contractAddresses: string[]
): Promise<TokenSecurityReport[]> {
  const uniqueContracts = Array.from(
    new Set(
      contractAddresses
        .map((addr) => addr.trim().toLowerCase())
        .filter((addr) => isAddress(addr))
    )
  );

  if (uniqueContracts.length === 0) {
    return [];
  }

  const reports: TokenSecurityReport[] = [];
  const batchSize = 20;

  for (let i = 0; i < uniqueContracts.length; i += batchSize) {
    const chunk = uniqueContracts.slice(i, i + batchSize);
    const url = `${GOPLUS_TOKEN_SECURITY_URL}?contract_addresses=${encodeURIComponent(
      chunk.join(",")
    )}`;
    const json = await fetchGoPlusJson<GoPlusTokenSecurityResponse>(
      url,
      "Token Security"
    );

    const resultMap = json.result ?? {};
    for (const contractAddr of chunk) {
      const raw = resultMap[contractAddr];
      if (!raw) continue;

      const isHoneypot = isGoPlusFlagTrue(raw.is_honeypot);
      const buyTaxPercent = parseTaxPercent(raw.buy_tax);
      const sellTaxPercent = parseTaxPercent(raw.sell_tax);
      const isOpenSource = isGoPlusFlagTrue(raw.is_open_source);
      const isMintable = isGoPlusFlagTrue(raw.is_mintable);
      const canTakeBackOwnership = isGoPlusFlagTrue(
        raw.can_take_back_ownership
      );
      const hiddenOwner = isGoPlusFlagTrue(raw.hidden_owner);
      const isBlacklisted = isGoPlusFlagTrue(raw.is_blacklisted);
      const isTrustList = isGoPlusFlagTrue(raw.trust_list);
      const isProxy = isGoPlusFlagTrue(raw.is_proxy);
      const cannotSellAll = isGoPlusFlagTrue(raw.cannot_sell_all);
      const honeypotWithSameCreator = isGoPlusFlagTrue(
        raw.honeypot_with_same_creator
      );
      const isInDex = isGoPlusFlagTrue(raw.is_in_dex);
      const parsedHolders =
        raw.holder_count !== undefined && raw.holder_count !== ""
          ? Number(raw.holder_count)
          : null;
      const holderCount =
        parsedHolders !== null && Number.isFinite(parsedHolders)
          ? parsedHolders
          : null;

      const riskFlags: string[] = [];
      if (isHoneypot) riskFlags.push("HONEYPOT");
      if (cannotSellAll) riskFlags.push("CANNOT_SELL_ALL");
      if (honeypotWithSameCreator) riskFlags.push("HONEYPOT_CREATOR");
      if (buyTaxPercent >= 5) riskFlags.push("HIGH_BUY_TAX");
      if (sellTaxPercent >= 5) riskFlags.push("HIGH_SELL_TAX");
      if (!isOpenSource) riskFlags.push("UNVERIFIED_SOURCE");
      if (isMintable) riskFlags.push("MINTABLE");
      if (canTakeBackOwnership) riskFlags.push("OWNERSHIP_TAKEBACK");
      if (hiddenOwner) riskFlags.push("HIDDEN_OWNER");
      if (isBlacklisted) riskFlags.push("BLACKLIST_FUNCTION");
      if (isProxy) riskFlags.push("PROXY_CONTRACT");

      let severity: RiskLevel = "SAFE";
      if (
        isHoneypot ||
        cannotSellAll ||
        honeypotWithSameCreator ||
        buyTaxPercent >= 25 ||
        sellTaxPercent >= 25 ||
        canTakeBackOwnership ||
        hiddenOwner
      ) {
        severity = "DANGER";
      } else if (
        !isOpenSource ||
        isMintable ||
        isBlacklisted ||
        buyTaxPercent >= 5 ||
        sellTaxPercent >= 5 ||
        isProxy
      ) {
        severity = "CAUTION";
      }

      reports.push({
        contractAddress: contractAddr,
        tokenName: raw.token_name?.trim() || "Unknown Token",
        tokenSymbol: raw.token_symbol?.trim() || "UNKNOWN",
        isHoneypot,
        buyTaxPercent,
        sellTaxPercent,
        isOpenSource,
        isMintable,
        canTakeBackOwnership,
        hiddenOwner,
        isBlacklisted,
        isTrustList,
        isProxy,
        cannotSellAll,
        honeypotWithSameCreator,
        holderCount,
        isInDex,
        riskFlags,
        severity,
      });
    }
  }

  return reports;
}

const RISK_PRIORITY: Record<RiskLevel, number> = {
  DANGER: 0,
  CAUTION: 1,
  SAFE: 2,
};

/**
 * Scans active BEP-20 token approvals for a BNB Smart Chain wallet via GoPlus v2 Token Approval Security API.
 */
export async function scanWalletApprovalsWithGoPlus(
  walletAddress: string
): Promise<ApprovalRiskItem[]> {
  const normalized = walletAddress.trim().toLowerCase();
  const url = `${GOPLUS_APPROVAL_SECURITY_URL}?addresses=${encodeURIComponent(
    normalized
  )}`;
  const json = await fetchGoPlusJson<GoPlusApprovalSecurityResponse>(
    url,
    "Approval Security v2"
  );

  const tokenEntries = Array.isArray(json.result) ? json.result : [];
  const approvals: ApprovalRiskItem[] = [];

  for (const token of tokenEntries) {
    const tokenAddress = token.token_address?.trim().toLowerCase() || "";
    if (!isAddress(tokenAddress)) continue;

    const tokenName = token.token_name?.trim() || "Unknown Token";
    const tokenSymbol = token.token_symbol?.trim() || "TOKEN";
    const balance = token.balance?.trim() || "0";
    const isTokenOpenSource = isGoPlusFlagTrue(token.is_open_source);
    const tokenMaliciousBehaviors = Array.isArray(token.malicious_behavior)
      ? token.malicious_behavior
      : [];
    const isTokenMalicious =
      isGoPlusFlagTrue(token.malicious_address) ||
      tokenMaliciousBehaviors.length > 0;

    const approvedList = Array.isArray(token.approved_list)
      ? token.approved_list
      : [];

    for (const entry of approvedList) {
      const spenderContract =
        entry.approved_contract?.trim().toLowerCase() || "";
      if (!isAddress(spenderContract)) continue;

      const approvedAmount = entry.approved_amount?.trim() || "0";
      const isUnlimited = isUnlimitedAllowance(approvedAmount);
      const info = entry.address_info;

      const isSpenderContract = isGoPlusFlagTrue(info?.is_contract);
      const isSpenderOpenSource = isGoPlusFlagTrue(info?.is_open_source);
      const isSpenderTrusted = isGoPlusFlagTrue(info?.trust_list);
      const isSpenderDoubtful = isGoPlusFlagTrue(info?.doubt_list);
      const spenderMalicious = Array.isArray(info?.malicious_behavior)
        ? info.malicious_behavior
        : [];
      const maliciousBehaviors = Array.from(
        new Set([...tokenMaliciousBehaviors, ...spenderMalicious])
      );

      let riskLevel: RiskLevel = "SAFE";
      if (
        isTokenMalicious ||
        maliciousBehaviors.length > 0 ||
        isSpenderDoubtful ||
        (isUnlimited && !isSpenderTrusted && !isSpenderOpenSource)
      ) {
        riskLevel = "DANGER";
      } else if ((isUnlimited && !isSpenderTrusted) || !isSpenderContract) {
        riskLevel = "CAUTION";
      }

      approvals.push({
        tokenAddress,
        tokenName,
        tokenSymbol,
        balance,
        isTokenOpenSource,
        isTokenMalicious,
        spenderContract,
        spenderName: info?.contract_name?.trim() || null,
        spenderTag: info?.tag?.trim() || null,
        approvedAmount,
        isUnlimited,
        isSpenderContract,
        isSpenderOpenSource,
        isSpenderTrusted,
        isSpenderDoubtful,
        maliciousBehaviors,
        approvedTime:
          typeof entry.approved_time === "number" ? entry.approved_time : null,
        riskLevel,
      });
    }
  }

  return approvals.sort(
    (a, b) => RISK_PRIORITY[a.riskLevel] - RISK_PRIORITY[b.riskLevel]
  );
}

/**
 * Scans an address (wallet, token contract, or approval spender) for phishing/drainer/cybercrime
 * history on BNB Smart Chain via GoPlus Malicious Address Security v1 API.
 */
export async function scanAddressSecurityWithGoPlus(
  address: string
): Promise<AddressSecurityReport> {
  const normalized = address.trim().toLowerCase();
  const url = `${GOPLUS_ADDRESS_SECURITY_URL}/${encodeURIComponent(
    normalized
  )}?chain_id=56`;

  const json = await fetchGoPlusJson<GoPlusAddressSecurityResponse>(
    url,
    "Address Security"
  );

  const raw = json.result ?? {};
  const isPhishing = isGoPlusFlagTrue(raw.phishing_activities);
  const isStealingAttack = isGoPlusFlagTrue(raw.stealing_attack);
  const isHoneypotRelated = isGoPlusFlagTrue(raw.honeypot_related_address);
  const isCybercrime = isGoPlusFlagTrue(raw.cybercrime);
  const isMoneyLaundering = isGoPlusFlagTrue(raw.money_laundering);
  const isFinancialCrime = isGoPlusFlagTrue(raw.financial_crime);
  const isBlackmail = isGoPlusFlagTrue(raw.blackmail_activities);
  const isSanctioned = isGoPlusFlagTrue(raw.sanctioned);
  const isBlacklistDoubt = isGoPlusFlagTrue(raw.blacklist_doubt);
  const isFakeToken = isGoPlusFlagTrue(raw.fake_token);
  const isMixer = isGoPlusFlagTrue(raw.mixer);

  const parsedMaliciousContracts = Number(
    raw.number_of_malicious_contracts_created ?? "0"
  );
  const maliciousContractsCreated = Number.isFinite(parsedMaliciousContracts)
    ? Math.max(0, Math.floor(parsedMaliciousContracts))
    : 0;

  const threatFlags: string[] = [];
  if (isPhishing) threatFlags.push("PHISHING_ACTIVITY");
  if (isStealingAttack) threatFlags.push("STEALING_ATTACK_DRAINER");
  if (isHoneypotRelated) threatFlags.push("HONEYPOT_RELATED");
  if (isCybercrime) threatFlags.push("CYBERCRIME");
  if (isMoneyLaundering) threatFlags.push("MONEY_LAUNDERING");
  if (isFinancialCrime) threatFlags.push("FINANCIAL_CRIME");
  if (isBlackmail) threatFlags.push("BLACKMAIL");
  if (isSanctioned) threatFlags.push("SANCTIONED");
  if (isBlacklistDoubt) threatFlags.push("BLACKLIST_DOUBT");
  if (isFakeToken) threatFlags.push("FAKE_TOKEN");
  if (isMixer) threatFlags.push("MIXER");
  if (maliciousContractsCreated > 0) {
    threatFlags.push("MALICIOUS_CONTRACTS_CREATED");
  }

  let riskLevel: RiskLevel = "SAFE";
  if (
    isPhishing ||
    isStealingAttack ||
    isHoneypotRelated ||
    isCybercrime ||
    isMoneyLaundering ||
    isFinancialCrime ||
    isBlackmail ||
    isSanctioned ||
    maliciousContractsCreated > 0
  ) {
    riskLevel = "DANGER";
  } else if (isBlacklistDoubt || isFakeToken || isMixer) {
    riskLevel = "CAUTION";
  }

  return {
    address: normalized,
    isPhishing,
    isStealingAttack,
    isHoneypotRelated,
    isCybercrime,
    isMoneyLaundering,
    isFinancialCrime,
    isBlackmail,
    isSanctioned,
    isBlacklistDoubt,
    isFakeToken,
    isMixer,
    maliciousContractsCreated,
    dataSource: raw.data_source?.trim() || "GoPlus Security",
    threatFlags,
    riskLevel,
  };
}

/**
 * Scans a website / dApp URL for phishing indicators, audit verification, and associated malicious
 * contracts via GoPlus Phishing Site API + dApp Security API.
 */
export async function scanPhishingSiteWithGoPlus(
  rawUrl: string
): Promise<PhishingSiteReport> {
  const normalizedUrl = /^https?:\/\//i.test(rawUrl.trim())
    ? rawUrl.trim()
    : `https://${rawUrl.trim()}`;
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.toLowerCase();

  const [phishingJson, dappJson] = await Promise.all([
    fetchGoPlusJson<GoPlusPhishingSiteResponse>(
      `${GOPLUS_PHISHING_SITE_URL}?url=${encodeURIComponent(normalizedUrl)}`,
      "Phishing Site"
    ),
    fetchGoPlusJson<GoPlusDappSecurityResponse>(
      `${GOPLUS_DAPP_SECURITY_URL}?url=${encodeURIComponent(normalizedUrl)}`,
      "dApp Security",
      [2026] // GoPlus returns code 2026 ("DAPP not found!") for unregistered/unknown dApps
    ),
  ]);

  const phishingResult = phishingJson.result ?? {};
  const isPhishingSite = isGoPlusFlagTrue(phishingResult.phishing_site);

  const isRegisteredDapp = dappJson.code === 1 && Boolean(dappJson.result);
  const dappResult = isRegisteredDapp ? dappJson.result! : null;

  const projectName = dappResult?.project_name?.trim() || null;
  const isAudited = isGoPlusFlagTrue(dappResult?.is_audit);
  const isTrustedDapp = isGoPlusFlagTrue(dappResult?.trust_list);

  const audits = Array.isArray(dappResult?.audit_info)
    ? dappResult.audit_info
        .filter((a) => Boolean(a?.audit_firm || a?.audit_link))
        .map((a) => ({
          firm: a.audit_firm?.trim() || "Security Auditor",
          time: a.audit_time?.trim() || null,
          link: a.audit_link?.trim() || null,
        }))
    : [];

  const scannedContracts = new Set<string>();
  const maliciousContracts = new Set<string>();

  const websiteContracts = Array.isArray(
    phishingResult.website_contract_security
  )
    ? phishingResult.website_contract_security
    : [];
  websiteContracts.forEach((wc, idx) => {
    const key = wc.contract?.trim().toLowerCase() || `site-contract-${idx}`;
    scannedContracts.add(key);
    if (Array.isArray(wc.address_risk) && wc.address_risk.length > 0) {
      maliciousContracts.add(key);
    }
  });

  const dappContractGroups = Array.isArray(dappResult?.contracts_security)
    ? dappResult.contracts_security
    : [];
  for (const group of dappContractGroups) {
    const contracts = Array.isArray(group.contracts) ? group.contracts : [];
    contracts.forEach((c, idx) => {
      const key =
        c.contract_address?.trim().toLowerCase() ||
        `dapp-${group.chain_id ?? "unknown"}-${idx}`;
      scannedContracts.add(key);
      if (
        isGoPlusFlagTrue(c.malicious_contract) ||
        isGoPlusFlagTrue(c.malicious_creator) ||
        (Array.isArray(c.malicious_behavior) &&
          c.malicious_behavior.length > 0)
      ) {
        maliciousContracts.add(key);
      }
    });
  }

  const websiteContractsScanned = scannedContracts.size;
  const maliciousContractsCount = maliciousContracts.size;

  const isOfficialDomain = OFFICIAL_WEB3_DOMAINS.some(
    (dom) => hostname === dom || hostname.endsWith(`.${dom}`)
  );
  const containsBrandOrBaitKeyword = BRAND_LOOKALIKE_KEYWORDS.some((kw) =>
    hostname.includes(kw)
  );
  const isLookalikeSuspect =
    !isTrustedDapp && !isOfficialDomain && containsBrandOrBaitKeyword;

  const riskFlags: string[] = [];
  if (isPhishingSite) riskFlags.push("PHISHING_SITE");
  if (maliciousContractsCount > 0) riskFlags.push("MALICIOUS_DAPP_CONTRACT");
  if (isLookalikeSuspect) riskFlags.push("LOOKALIKE_DOMAIN_SUSPECT");
  if (!isRegisteredDapp) riskFlags.push("UNVERIFIED_DAPP");
  if (!isAudited && !isTrustedDapp) riskFlags.push("NO_SECURITY_AUDIT");

  let riskLevel: RiskLevel = "SAFE";
  if (isPhishingSite || maliciousContractsCount > 0) {
    riskLevel = "DANGER";
  } else if (
    isLookalikeSuspect ||
    !isRegisteredDapp ||
    (!isAudited && !isTrustedDapp)
  ) {
    riskLevel = "CAUTION";
  }

  return {
    url: normalizedUrl,
    hostname,
    isPhishingSite,
    isRegisteredDapp,
    projectName,
    isAudited,
    isTrustedDapp,
    audits,
    maliciousContractsCount,
    websiteContractsScanned,
    riskFlags,
    riskLevel,
  };
}
