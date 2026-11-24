import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  binanceWallet,
  okxWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "3a8170812b534d0ff9d794f19a901d64";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended for BNB Chain",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        binanceWallet,
        trustWallet,
        okxWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: "AI Wallet Copilot ($COAI)",
    projectId,
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [bsc],
  transports: {
    [bsc.id]: http("https://bsc-dataseed.binance.org/"),
  },
  ssr: true,
});
