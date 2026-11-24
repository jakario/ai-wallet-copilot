import { type Address } from "viem";

export const BSC_CHAIN_ID = 56;

export const COAI_TOKEN_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_COAI_TOKEN_ADDRESS as Address) ||
  "0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5";

export const COAI_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_COAI_THRESHOLD ?? "10"
);

export const ERC20_BALANCE_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const SAMPLE_BSC_WALLETS: { label: string; address: Address }[] = [
  {
    label: "PancakeSwap Active Trader",
    address: "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3",
  },
  {
    label: "BNB Whale Hot Wallet",
    address: "0xF977814e90dA44bFA03b6295A0616a897441aceC",
  },
  {
    label: "Fresh / Empty Wallet",
    address: "0x000000000000000000000000000000000000dEaD",
  },
];

export const SAMPLE_BSC_TOKENS: { label: string; address: Address }[] = [
  {
    label: "$COAI (ChainOpera AI)",
    address: "0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5",
  },
  {
    label: "$CAKE (PancakeSwap)",
    address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  },
  {
    label: "$USDT (BSC-USD)",
    address: "0x55d398326f99059fF775485246999027B3197955",
  },
];

export const SAMPLE_SECURITY_URLS: { label: string; url: string }[] = [
  {
    label: "PancakeSwap (Official)",
    url: "https://pancakeswap.finance",
  },
  {
    label: "ChainOpera AI",
    url: "https://chainopera.ai",
  },
  {
    label: "Suspicious Airdrop Link",
    url: "https://pancakeswap-airdrop.xyz",
  },
];
