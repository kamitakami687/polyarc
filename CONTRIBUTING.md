# Contributing to PolyArc

Thanks for your interest in extending PolyArc. This document explains the architecture so you can contribute without having to reverse-engineer the code yourself.

---

## Architecture overview

```
User browser
     │
     │  GET /api/research?topic=...   (SSE stream)
     ▼
server.ts  ──────────────────────────────────────────────┐
     │                                                    │
     │  runResearch()                                     │
     ▼                                                    │
research-agent.ts                                         │
     │                                                    │
     ├── fetchPolymarketMarkets()   → Polymarket Gamma API│
     ├── fetchWikipedia()           → Wikipedia REST API  │
     ├── fetchDuckDuckGo()          → DuckDuckGo Instant  │
     ├── fetchGoogleNews()          → Google News RSS     │
     │                                                    │
     ├── runInitialAssessment()     → gpt-4o-mini         │
     │      ↓ if needsPremiumData=true                    │
     └── GatewayClient.pay()  ──► GET /premium/analyze-market
                                        │
                              gateway.require("$0.05")
                                        │
                              Circle Gateway (Arc Testnet)
                                        │
                              runDeepAnalysis() → gpt-4o
```

---

## The x402 payment flow — step by step

x402 is an HTTP extension where a server signals a price for a resource and the client pays before accessing it. Here is exactly how it works in this codebase.

### 1. Server declares a price

In `server.ts`, the `createGatewayMiddleware` from `@circle-fin/x402-batching/server` wraps the Express route:

```typescript
const gateway = createGatewayMiddleware({
  sellerAddress: SELLER,          // who receives the USDC
  facilitatorUrl: 'https://gateway-api-testnet.circle.com',
  networks: ['eip155:5042002'],   // Arc Testnet chain ID
});

app.get('/premium/analyze-market', gateway.require('$0.05'), handler);
```

When a client hits this route without a payment header, the middleware returns HTTP `402 Payment Required` with a JSON body describing the price, currency, and network. The handler never runs.

### 2. Client reads the 402 and signs a payment

In `research-agent.ts`, the `GatewayClient` from `@circle-fin/x402-batching/client` handles the full payment handshake:

```typescript
const client = new GatewayClient({ chain: 'arcTestnet', privateKey });
const result = await client.pay(url);
```

Internally, the client:
1. Makes the initial GET — receives the 402 with payment terms
2. Signs a `TransferWithAuthorization` EIP-712 typed-data message (off-chain, no gas)
3. Retries the GET with an `X-Payment` header containing the signed authorization
4. The middleware forwards the signature to the Circle facilitator (`POST /v1/x402/settle`)
5. The facilitator returns a settlement UUID and optimistically debits the buyer's balance
6. The middleware passes the request through to the handler with `req.payment` populated

### 3. Circle batches and settles on-chain

The Circle relayer watches for settled authorizations and periodically calls `submitBatch()` on the `GatewayWallet` contract on Arc Testnet — bundling multiple payments into a single transaction. On testnet expect ~10 minutes; on a busy mainnet it would be seconds.

Arc has sub-second deterministic finality — once the batch lands on-chain it is immediately irreversible, with no waiting for confirmations.

### 4. The agent enforces its own budget

`research-agent.ts` tracks spend locally before attempting any payment:

```typescript
const BUDGET_USDC = 0.10;
const PREMIUM_COST_USDC = 0.05;

const canAfford = budgetUsedUsdc + PREMIUM_COST_USDC <= BUDGET_USDC;
if (initial.needsPremiumData && canAfford) {
  // attempt x402 payment
}
```

The budget check is server-side. The frontend cannot override it.

---

## Decision engine — when does the agent pay?

`runInitialAssessment()` asks `gpt-4o-mini` to return:

```json
{
  "summary": "...",
  "needsPremiumData": true,
  "confidence": "low"
}
```

The agent pays for premium GPT-4o analysis only when **all three** are true:
- `needsPremiumData === true` (free sources are insufficient)
- `canAfford === true` (budget not exhausted)
- `PRIVATE_KEY` is set (wallet is configured)

If the wallet is not configured, `runDeepAnalysis()` runs anyway (directly via OpenAI), so the analysis still works — the payment is just skipped.

---

## Key files

| File | Responsibility |
|---|---|
| `server.ts` | Express server, x402 middleware config, SSE endpoint, settlement/batch proxy routes |
| `research-agent.ts` | Polymarket fetch, free source research, GPT-4o-mini/gpt-4o calls, budget tracking, `GatewayClient.pay()` |
| `buyer.ts` | Standalone CLI buyer — pays any x402-gated URL from a raw private key |
| `decode-batch.ts` | Decodes on-chain `submitBatch()` calldata into per-buyer USDC deltas and settlement UUIDs |
| `public/research.html` | SSE consumer UI — progress log, markets table, verdict box, budget tracker |
| `public/buyer.html` | Six-step payment trace UI — EIP-712 → facilitator → queued → relayer → on-chain → completed |

---

## Adding a new paywalled endpoint

1. Add the route to `server.ts` with `gateway.require("$X.XX")`
2. In `research-agent.ts`, decide when the agent should call it (new condition in `runResearch()`)
3. Make the call via `client.pay(url)` — the x402 handshake is automatic
4. Track spend: increment `budgetUsedUsdc` and push to `payments[]`

The middleware populates `req.payment` with `{ payer, amount, network, transaction }` for every successful payment — use `transaction` as the settlement UUID for the Payment Trace tab.

---

## Adding a new free research source

1. Export a new `fetchXxx(topic: string): Promise<ResearchSource | null>` function from `research-agent.ts`
2. Add it to the `Promise.all()` call inside `runResearch()`
3. Filter nulls and push to `freeResearch[]`

`ResearchSource` shape: `{ source: string, url: string, summary: string }`

---

## Arc network constants

| Constant | Value |
|---|---|
| Chain ID | `eip155:5042002` |
| RPC endpoint | `https://rpc.testnet.arc.network` |
| Circle Gateway (testnet) | `https://gateway-api-testnet.circle.com` |
| Block explorer | `https://testnet.arcscan.app` |
| GatewayWallet contract | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| Seller address | `0x933a2405f84c224be1ef373ba16e992e1f459682` |
| Gas token | USDC (not ETH — Arc uses USDC as its native gas token) |

---

## Arc Agentic Economy standards

Arc has two EVM standards purpose-built for autonomous agents. Neither is implemented in PolyArc yet, but both are natural next steps.

### ERC-8004 — Onchain agent identity

ERC-8004 provides a native registry for agent identity, reputation events, and credential verification on Arc. Registering PolyArc under this standard would give it a verifiable onchain identity — other agents, users, and contracts could look up its track record of completed analyses and payments.

Docs: [docs.arc.io/arc/tutorials/register-your-first-ai-agent](https://docs.arc.io/arc/tutorials/register-your-first-ai-agent)

### ERC-8183 — Job escrow and USDC settlement

ERC-8183 defines the full job lifecycle: creation, escrow funding, deliverable submission, evaluation, and USDC settlement. PolyArc's premium analysis requests are a natural fit — instead of a direct x402 payment, a user could open a job, fund USDC escrow, receive the analysis as a deliverable, approve it, and trigger settlement. This makes every analysis request verifiable and disputable on-chain.

Docs: [docs.arc.io/arc/tutorials/create-your-first-erc-8183-job](https://docs.arc.io/arc/tutorials/create-your-first-erc-8183-job)

---

## Unified Balance — funding the agent from any chain

Currently the agent wallet must hold USDC on Arc Testnet specifically. Arc's [Unified Balance](https://docs.arc.io/app-kit/unified-balance) API (from `@circle-fin/unified-balance-kit`) combines USDC from multiple chains — Base, Solana, Ethereum, Arc — into a single instantly spendable pool.

Integrating Unified Balance would let users fund the agent from any chain they already hold USDC on, without bridging manually. The spend side would still target Arc Testnet.

```typescript
import { AppKit } from '@circle-fin/app-kit';

const kit = new AppKit();

// deposit from any chain
await kit.unifiedBalance.deposit({ from: { adapter, chain: 'Base_Sepolia' }, amount: '1.00', token: 'USDC' });

// spend on Arc — same API regardless of deposit source
await kit.unifiedBalance.spend({ amount: '0.05', token: 'USDC', from: [{ adapter }], to: { adapter, chain: 'Arc_Testnet', recipientAddress: SELLER } });
```

Quickstart: [docs.arc.io/app-kit/quickstarts/unified-balance-deposit-and-spend](https://docs.arc.io/app-kit/quickstarts/unified-balance-deposit-and-spend)

---

## Running locally for development

```bash
npm install
cp .env.example .env   # fill in CIRCLE_API_KEY, OPENAI_API_KEY, PRIVATE_KEY
npm start              # http://localhost:5000
```

Run the research agent directly from the CLI (no browser needed):

```bash
npx tsx research-agent.ts "Will Bitcoin hit $200k in 2025?"
```

Pay any x402-gated URL from the CLI:

```bash
export PRIVATE_KEY=0x...
npx tsx buyer.ts http://localhost:5000/premium/analyze-market?topic=bitcoin
```

Decode any `submitBatch` transaction on Arc Testnet:

```bash
npx tsx decode-batch.ts 0x<tx-hash>
```

---

## Questions

- Canteen Discord: [discord.gg/rsVfYutFZg](https://discord.gg/rsVfYutFZg)
- Arc builder Discord: [discord.com/invite/buildonarc](https://discord.com/invite/buildonarc)
