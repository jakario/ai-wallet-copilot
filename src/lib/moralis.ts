import "server-only";
import { formatEther, isAddress, type Address } from "viem";
import type { WalletActivitySummary } from "./schemas";

interface JsonRpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface AlchemyAssetTransfer {
  blockNum: string;
  uniqueId?: string;
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  category: "external" | "erc20" | "erc721" | "erc1155" | "internal";
  rawContract?: {
    value?: string | null;
    address?: string | null;
    decimal?: string | null;
  };
  metadata?: {
    blockTimestamp?: string;
  };
}

interface AlchemyTransfersResult {
  transfers: AlchemyAssetTransfer[];
  pageKey?: string;
}

const SPAM_SYMBOL_PATTERN =
  /(\.com|\.net|\.org|\.io|\.xyz|\.cc|\.top|http|www|claim|visit|airdrop|voucher|reward|bonus|t\.me)/i;

/**
 * Filters out BSC phishing/dusting spam tokens (e.g., Chinese/CJK spam names like "币安特权",
 * Unicode homoglyphs like Greek-tau "USDΤ", or phishing URLs disguised as token symbols).
 */
function isCleanTokenSymbol(rawSymbol: string | null | undefined): string | null {
  if (!rawSymbol) return null;
  const trimmed = rawSymbol.trim();
  // Allow only clean ASCII ticker characters (1–12 chars)
  if (!/^[A-Za-z0-9._-]{1,12}$/.test(trimmed)) return null;
  if (SPAM_SYMBOL_PATTERN.test(trimmed)) return null;
  return trimmed;
}

async function callAlchemyRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const errMsg = `[Alchemy RPC HTTP ${res.status}] Method ${method} failed: ${
      bodyText || res.statusText
    }`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const payload = (await res.json()) as JsonRpcResponse<T>;

  if (payload.error) {
    const errMsg = `[Alchemy RPC Error] ${method} (${payload.error.code}): ${
      payload.error.message
    }${payload.error.data ? ` - ${JSON.stringify(payload.error.data)}` : ""}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  if (payload.result === undefined) {
    const errMsg = `[Alchemy RPC Error] ${method} returned undefined result: ${JSON.stringify(
      payload
    )}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return payload.result;
}

function getAlchemyRpcUrl(): string {
  const apiKey = process.env.ALCHEMY_API_KEY?.trim();

  if (!apiKey || apiKey === "your_alchemy_api_key_here") {
    const errMsg =
      "[Alchemy Error] Missing ALCHEMY_API_KEY in environment variables (.env.local).";
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`;
}

export async function fetchWalletActivity30d(
  rawAddress: string
): Promise<WalletActivitySummary> {
  const address = rawAddress.toLowerCase() as Address;
  const rpcUrl = getAlchemyRpcUrl();

  // Fetch current block number so we can calculate the ~30-day block range on BNB Chain (~3s/block => ~864,000 blocks)
  // and fetch native BNB balance + outgoing & incoming asset transfers (external + erc20) in parallel.
  const [balanceHex, blockNumberHex, outgoingRes, incomingRes] =
    await Promise.all([
      callAlchemyRpc<string>(rpcUrl, "eth_getBalance", [address, "latest"]),
      callAlchemyRpc<string>(rpcUrl, "eth_blockNumber", []),
      callAlchemyRpc<AlchemyTransfersResult>(
        rpcUrl,
        "alchemy_getAssetTransfers",
        [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: address,
            category: ["external", "erc20"],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0xfa", // up to 250 recent outgoing transfers
            order: "desc",
          },
        ]
      ),
      callAlchemyRpc<AlchemyTransfersResult>(
        rpcUrl,
        "alchemy_getAssetTransfers",
        [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: address,
            category: ["external", "erc20"],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: "0xfa", // up to 250 recent incoming transfers
            order: "desc",
          },
        ]
      ),
    ]);

  const nativeBnbWei = BigInt(balanceHex);
  const nativeBnbBalance = Number(formatEther(nativeBnbWei)).toFixed(4);

  const currentBlock = Number(BigInt(blockNumberHex));
  // BNB Smart Chain produces ~28,800 blocks/day (~864,000 blocks per 30 days)
  const thirtyDaysAgoBlock = Math.max(0, currentBlock - 864_000);
  const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const isWithinLast30Days = (tr: AlchemyAssetTransfer): boolean => {
    if (tr.metadata?.blockTimestamp) {
      const ts = Date.parse(tr.metadata.blockTimestamp);
      if (!Number.isNaN(ts)) {
        return ts >= thirtyDaysAgoMs;
      }
    }
    const blk = Number(BigInt(tr.blockNum || "0x0"));
    return blk >= thirtyDaysAgoBlock;
  };

  const outgoing30d = (outgoingRes.transfers ?? []).filter(isWithinLast30Days);
  const incoming30d = (incomingRes.transfers ?? []).filter(isWithinLast30Days);

  // Deduplicate transfers across outgoing & incoming by uniqueId or hash+category+asset
  const allTransfersMap = new Map<string, AlchemyAssetTransfer>();
  for (const tr of [...outgoing30d, ...incoming30d]) {
    const key =
      tr.uniqueId || `${tr.hash}-${tr.category}-${tr.from}-${tr.to}-${tr.asset}`;
    allTransfersMap.set(key, tr);
  }
  const allTransfers30d = Array.from(allTransfersMap.values());

  // Unique transaction hashes in the last 30 days
  const uniqueTxHashes = new Set<string>();
  const outgoingTxHashes = new Set<string>();
  let tokenTransferCount30d = 0;

  const tokenCounts = new Map<string, number>();

  for (const tr of allTransfers30d) {
    if (tr.hash) {
      uniqueTxHashes.add(tr.hash);
      if (tr.from?.toLowerCase() === address) {
        outgoingTxHashes.add(tr.hash);
      }
    }

    if (tr.category === "erc20") {
      tokenTransferCount30d++;
      const isUnsolicitedZeroDust =
        tr.from?.toLowerCase() !== address && (!tr.value || tr.value === 0);
      const cleanSym = isUnsolicitedZeroDust
        ? null
        : isCleanTokenSymbol(tr.asset);
      if (cleanSym) {
        tokenCounts.set(cleanSym, (tokenCounts.get(cleanSym) ?? 0) + 1);
      }
    } else if (tr.category === "external" && tr.asset) {
      const cleanSym = isCleanTokenSymbol(tr.asset);
      if (cleanSym) {
        tokenCounts.set(cleanSym, (tokenCounts.get(cleanSym) ?? 0) + 1);
      }
    }
  }

  const txCount30d = uniqueTxHashes.size;
  const outflowCount = outgoing30d.length;
  const inflowCount = incoming30d.length;

  // Estimate or compute gas spent from outgoing transactions on BSC (standard BSC swap/transfer ~0.00015 - 0.00045 BNB)
  // Fetch exact gas price from RPC to compute realistic gas expenditure for outgoing transactions
  const gasPriceHex = await callAlchemyRpc<string>(
    rpcUrl,
    "eth_gasPrice",
    []
  );
  const currentGasPriceWei = BigInt(gasPriceHex);
  const avgGasUnitsPerTx = BigInt(110_000);
  const totalGasWei =
    BigInt(outgoingTxHashes.size) * avgGasUnitsPerTx * currentGasPriceWei;
  const totalGasSpentBnb = Number(formatEther(totalGasWei)).toFixed(5);

  const topInteractedTokens = Array.from(tokenCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, count]) => ({ symbol, count }));

  const isEmptyOrNewWallet =
    txCount30d === 0 &&
    tokenTransferCount30d === 0 &&
    nativeBnbWei === BigInt(0);

  let winLossPattern = "Balanced accumulation and rotation across BSC assets.";
  if (isEmptyOrNewWallet) {
    winLossPattern =
      "Zero activity and 0 BNB — paralyzed spectator too scared to sign a single transaction.";
  } else if (txCount30d === 0 && tokenTransferCount30d === 0) {
    winLossPattern = `Dormant HODLer sitting on ${nativeBnbBalance} BNB for 30+ days without making a single move.`;
  } else if (outflowCount > inflowCount * 2) {
    winLossPattern =
      "Heavy net seller / panic dumper: way more outflows and gas burned than inflows.";
  } else if (inflowCount > outflowCount * 2) {
    winLossPattern =
      "Bag-collector mode: constantly buying/receiving tokens with almost zero profit-taking exits.";
  } else if (txCount30d > 50) {
    winLossPattern =
      "Hyper-active DEX overtrader donating BNB gas fees to validators around the clock.";
  }

  return {
    address: rawAddress,
    chain: "BNB Smart Chain (BSC)",
    periodDays: 30,
    nativeBnbBalance,
    txCount30d,
    tokenTransferCount30d,
    totalGasSpentBnb,
    topInteractedTokens,
    inflowCount,
    outflowCount,
    winLossPattern,
    isEmptyOrNewWallet,
    dataSource: "alchemy",
  };
}

/**
 * Fetches recently interacted BEP-20 token contract addresses for a BNB Chain wallet
 * via Alchemy's alchemy_getAssetTransfers API (zero mock/fallback).
 * Prioritizes outgoing/active transfers and filters out unsolicited zero-value dust & spam symbols.
 */
export async function fetchRecentWalletTokenContracts(
  rawAddress: string,
  maxContracts = 15
): Promise<string[]> {
  const address = rawAddress.toLowerCase() as Address;
  const rpcUrl = getAlchemyRpcUrl();

  const [outgoingRes, incomingRes] = await Promise.all([
    callAlchemyRpc<AlchemyTransfersResult>(rpcUrl, "alchemy_getAssetTransfers", [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        fromAddress: address,
        category: ["erc20"],
        withMetadata: false,
        excludeZeroValue: false,
        maxCount: "0x64",
        order: "desc",
      },
    ]),
    callAlchemyRpc<AlchemyTransfersResult>(rpcUrl, "alchemy_getAssetTransfers", [
      {
        fromBlock: "0x0",
        toBlock: "latest",
        toAddress: address,
        category: ["erc20"],
        withMetadata: false,
        excludeZeroValue: false,
        maxCount: "0x64",
        order: "desc",
      },
    ]),
  ]);

  const seen = new Set<string>();
  const orderedContracts: string[] = [];

  const collectFromTransfers = (
    transfers: AlchemyAssetTransfer[],
    isIncoming: boolean
  ) => {
    for (const tr of transfers) {
      if (orderedContracts.length >= maxContracts) break;
      const contract = tr.rawContract?.address?.trim().toLowerCase();
      if (!contract || !isAddress(contract) || seen.has(contract)) continue;

      if (isIncoming && (!tr.value || tr.value === 0)) {
        continue;
      }

      if (tr.asset && !isCleanTokenSymbol(tr.asset)) {
        continue;
      }

      seen.add(contract);
      orderedContracts.push(contract);
    }
  };

  // Prioritize outgoing/user-initiated interactions first, then legitimate incoming transfers
  collectFromTransfers(outgoingRes.transfers ?? [], false);
  collectFromTransfers(incomingRes.transfers ?? [], true);

  return orderedContracts;
}
