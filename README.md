# AI Wallet Copilot (`$COAI`)

> **Paste any BNB Chain address or URL. Audit habits, neutralize drainers, and master ecosystem testnets with ChainOpera AI.**

[![Live Production Beta](https://img.shields.io/badge/Live%20Demo-ai--wallet--copilot.vercel.app-00d4aa?style=for-the-badge)](https://ai-wallet-copilot.vercel.app)
[![Demo Video (90s)](https://img.shields.io/badge/Demo%20Video-90s%20Walkthrough-ff0000?style=for-the-badge&logo=youtube)](https://youtu.be/ilGU5vMSbLs)
[![BNB Smart Chain](https://img.shields.io/badge/Network-BNB%20Smart%20Chain%20(56)-f3ba2f?style=for-the-badge)](https://bscscan.com/token/0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.6-black?style=for-the-badge)](https://nextjs.org/)

- **Live Production Beta:** https://ai-wallet-copilot.vercel.app
- **90-Second Demo Video:** https://youtu.be/ilGU5vMSbLs
- **Builder:** `jakario` — Indie DeFi Developer (Bangkok, Thailand / UTC+7)
- **Contact:** `jakario@gmail.com` | X: `@jakario` | Discord: `@jakario`
- **Ecosystem Track:** ChainOpera AI Co-Creation Grant

---

## Core Value & Live Modules (100% Real-Time Data, Zero Mock/Fallback)

**AI Wallet Copilot** removes Web3 onboarding and security friction with a **Zero-Connect Basic Entry** model: paste any BNB Smart Chain (`chain_id: 56`) address, token contract, or URL to run live audits with zero wallet connection required. Wallet connection is only used to verify `$COAI` token holdings (`>= 10 $COAI` on BSC) for Pro tools or to sign on-chain `approve(spender, 0)` revoke transactions.

### 1. Phase 1 — Roast My Wallet *(Live on BSC Mainnet)*
- **30-Day Real On-Chain Scan:** Pulls live BNB balance, native/token transfers, and gas context via Alchemy BNB Mainnet RPC (`src/lib/moralis.ts`), with `isCleanTokenSymbol()` spam/homoglyph filtering to strip BSC airdrop noise before AI inference.
- **Degen Score (0–100) & Archetype:** Classifies trading behavior and generates sharp, wallet-specific commentary.
- **Dynamic Shareable OG Cards (`/api/og`):** Renders 1200×630 social cards with cached `Noto Sans Thai` fonts for one-click X sharing.
- **Bilingual Native UX (`EN` / `TH`):** Full English and Thai UI + AI output toggle for Southeast Asian retail onboarding.
- **`$COAI`-Gated Pro Trading Coach:** Unlocked for wallets holding `>= 10 $COAI`.

### 2. Phase 2 v2 — Wallet Security Guard *(Live on BSC Mainnet)*
A 3-mode real-time threat detection suite powered by **GoPlus Public Security APIs** (`src/lib/goplus.ts`) and our **AI Security Analyst** (`src/lib/security-ai.ts`):
- **Wallet & Approval / Drainer Scan:** Scans BEP-20 approvals via GoPlus `v2/token_approval_security/56`, flags unlimited allowances, and cross-checks untrusted spenders against `v1/address_security/{address}?chain_id=56`.
- **Token Contract DYOR Scan:** Evaluates contracts via `v1/token_security/56` for honeypots, buy/sell taxes, mintable supply, hidden/recoverable ownership, blacklist functions, and open-source verification.
- **Phishing URL & dApp Scanner:** Inspects links via `v1/phishing_site` and `v1/dapp_security` plus lookalike brand domain heuristics.
- **Pro Remediation (`>= 10 $COAI`):** Unlocks the full Deep Contract Audit Matrix and live **One-Click On-Chain Revoke** (`approve(spender, 0)` signed directly via Wagmi v2 + Viem).

### 3. Phase 3 — AI Testnet Copilot *(ChainOpera Grant Milestone 3)*
Planned interactive testnet onboarding & QA copilot backed by **ChainOpera RAG Knowledge Bases**, guiding users step-by-step across BNB Chain, opBNB, and ChainOpera partner testnets with on-chain task verification.

---

## ChainOpera AI Native Architecture

Our inference router (`src/lib/ai-provider.ts`) is engineered for **zero-refactor ChainOpera migration**:
1. **Priority 1 — ChainOpera Unified Model API:** Automatically activates when `CHAINOPERA_API_KEY`, `CHAINOPERA_API_BASE_URL`, and `CHAINOPERA_MODEL` are configured.
2. **Priority 2 — Groq Free-Tier Baseline:** Currently serves live beta traffic (`openai/gpt-oss-120b`) with strict `json_schema` output validated by Zod (`src/lib/schemas.ts`).
3. **Token Utility (`$COAI` Gate):** On-chain BEP-20 balance check against `$COAI` (`0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5`, threshold `10 $COAI`) unlocks Pro Trading Coach, Deep Contract Audit Matrix, and Checklist/Revoke workflows.

---

## Live Reviewer Quick-Test Guide

Test everything live on https://ai-wallet-copilot.vercel.app (zero wallet connection required):

| Module & Mode | Test Input | What to Observe |
| :--- | :--- | :--- |
| **Phase 1: Wallet Roast** | `0x8894E0a0c962CB723c1976a4421c95949bE2D4E3` | Live 30d BSC transfers, Degen Score, bilingual roast & `/api/og` share card |
| **Phase 2: Wallet & Approval Scan** | `0x8894E0a0c962CB723c1976a4421c95949bE2D4E3` | Live unlimited approvals, GoPlus spender risk check & Safety Score |
| **Phase 2: Token Contract Audit (`$COAI`)** | `0x0a8d6c86e1bce73fe4d0bd531e1a567306836ea5` | Real GoPlus Token Security v1 audit & AI risk breakdown |
| **Phase 2: Suspicious URL vs Verified dApp** | `https://pancakeswap-airdrop.xyz` vs `https://pancakeswap.finance` | Lookalike airdrop domain warning vs verified & audited PancakeSwap result |

---

## Tech Stack & Repository Structure

- **Frontend:** Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, Lucide React
- **Web3:** Wagmi v2, Viem, RainbowKit v2 (BNB Smart Chain `chain_id: 56`)
- **Backend / AI / Data:** Next.js Route Handlers (Vercel Serverless), Alchemy BNB Mainnet RPC, GoPlus Public Security APIs, OpenAI-compatible AI router (ChainOpera / Groq), Zod strict validation

```text
src/
├── app/
│   ├── api/
│   │   ├── og/route.tsx           # Dynamic 1200x630 localized OG share card
│   │   ├── roast/route.ts         # POST /api/roast (Alchemy 30d + AI Roast)
│   │   └── security/route.ts      # POST /api/security (Wallet / Token / URL scans)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Persistent tab shell (Phase 1 / 2 / 3)
├── components/
│   ├── Navbar.tsx                 # Phase tabs, EN/TH switcher, RainbowKit Connect
│   ├── RoastDashboard.tsx         # Phase 1 Wallet Roast UI
│   ├── ProTradingCoach.tsx        # $COAI-gated Pro Trading Coach
│   ├── SecurityGuard.tsx          # Phase 2 v2 Security Guard + One-Click Revoke
│   ├── PhasePreviewCard.tsx       # Phase 3 Testnet Copilot preview
│   └── providers/Web3Provider.tsx # Wagmi + RainbowKit + React Query providers
└── lib/
    ├── ai-provider.ts             # Priority 1 ChainOpera / Priority 2 Groq router
    ├── constants.ts               # BSC Chain ID, $COAI address/ABI, test presets
    ├── empty-module.ts            # Turbopack client build alias stubs
    ├── gemini.ts                  # Phase 1 Wallet Roast prompt & JSON builder
    ├── goplus.ts                  # GoPlus Token v1, Approval v2, Address & Phishing clients
    ├── i18n.ts                    # English & Thai dictionary
    ├── moralis.ts                 # Alchemy BNB Mainnet RPC & spam symbol filtering
    ├── schemas.ts                 # Zod schemas for requests & strict AI outputs
    ├── security-ai.ts             # Phase 2 AI Security Analyst
    └── wagmi.ts                   # BSC wallet connectors configuration
```

---

## Local Setup & Verification

```bash
# 1. Configure environment variables
cp .env.example .env.local
# Fill in ALCHEMY_API_KEY and either CHAINOPERA_API_KEY or GROQ_API_KEY

# 2. Install dependencies (Yarn recommended)
yarn install

# 3. Run local dev server
yarn dev

# 4. Type-check & production build
npx tsc --noEmit
yarn build
```

---

## 6-Month ChainOpera Grant Roadmap

- **Milestone 1 (Months 1–2) — ChainOpera Native Cutover & AI Terminal Launch:** Route 100% of production LLM traffic through ChainOpera Unified Model API, publish *Roast* and *Security Guard* agents on ChainOpera AI Terminal / Agent Store, and ship Security Guard v2.5.
- **Milestone 2 (Months 3–4) — Shared Security MCP Server & Agent-to-Agent `$COAI` Payments:** Open-source `bsc-wallet-security-mcp` on ChainOpera Agent Developer Platform so third-party trading/DeFi agents can execute pre-trade risk audits settled via `$COAI` micro-payments.
- **Milestone 3 (Months 5–6) — Phase 3 AI Testnet Copilot (ChainOpera RAG):** Index BNB Chain, opBNB, and ChainOpera partner testnet docs into ChainOpera RAG Knowledge Bases to automate guided onboarding and QA.
