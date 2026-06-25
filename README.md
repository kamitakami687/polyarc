# polyarc

AI-powered prediction market research agent. Autonomous x402 payments. Built on Arc Testnet.

> Ask any question about a prediction market. PolyArc researches it for free first — and only pays for premium AI analysis when the answer actually needs it.

---

## The Pitch

Prediction markets move fast. By the time you have manually researched whether the odds on an election, a crypto price, or a sports outcome are accurate, the moment has passed.

PolyArc does the research for you — autonomously.

Type a question like "Will Bitcoin hit $200k?" The agent checks Polymarket for the current odds, searches free sources first, and if the free data is not good enough, it pays $0.05 in USDC for a deep GPT-4o analysis — without asking you. No approvals. No clicking. No crypto knowledge required.

The payment happens via x402 on Arc Testnet — the same way your browser loads a webpage, except instead of a page loading, an AI agent pays for intelligence.

---

## What Makes It Different

- **Free first, pay only when needed.** The agent always tries free sources before spending anything. Most questions never trigger a payment at all.
- **Fully autonomous payments.** The agent holds its own USDC wallet and pays via x402 on Arc Testnet without any human approval per transaction.
- **Budget enforced automatically.** Each session has a $0.10 USDC hard cap. The agent cannot overspend — ever.
- **Every payment is visible.** The Payment Trace tab shows every transaction: what was paid, how much, and why the agent decided it was worth it.
- **Honest about what is live.** The table below is kept current. Trust it over any demo video or pitch.

---

## What Is Actually Live Today

| Feature | Status |
|---|---|
| Live Polymarket odds fetching | ✅ Live |
| Free source research (Wikipedia, DuckDuckGo, Google News) | ✅ Live |
| Autonomous x402 payment for premium GPT-4o analysis | ✅ Live |
| $0.10 session budget with real-time tracker | ✅ Live |
| Payment Trace tab with full on-chain history | ✅ Live |
| Cost-vs-value decision engine (pay or skip) | ✅ Live |
| One-click suggested market topics | ✅ Live |
| Arc Testnet USDC wallet for agent payments | ✅ Live |
| Multi-market comparison in one session | 🛠 In progress |
| Portfolio tracker for Polymarket positions | ❌ Not built yet |
| Mainnet USDC (real money) | ❌ Testnet only |

---

## How It Works — In Plain English

1. You type a question — for example "Who will win the 2026 midterms?"
2. PolyArc fetches the live Polymarket odds for that question
3. It searches Wikipedia, DuckDuckGo, and Google News — all free
4. It asks itself: is the free data good enough?
5. If yes — it writes a report and stops. No payment made.
6. If no — it pays $0.05 USDC via x402 on Arc Testnet for a premium GPT-4o deep analysis. No human clicks required.
7. You get a full report: current odds, what it researched, what it paid, and whether the market looks mispriced.

---

## Project Structure

```
polyarc/
├── research-agent.ts    # Core agent — searches free sources, decides when to pay
├── buyer.ts             # Handles x402 payments and Circle wallet signing
├── decode-batch.ts      # Decodes on-chain payment batches for the Payment Trace tab
├── public/              # Web UI — search box, results, Payment Trace tab
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── SETUP.md             # Step-by-step setup for non-developers
└── README.md
```

---

## Tech Stack

| Layer | What it uses |
|---|---|
| Blockchain | Arc Testnet — Circle's stablecoin L1, USDC as native gas |
| Payments | x402 protocol and Circle Gateway — sub-cent USDC payments |
| AI | OpenAI GPT-4o for premium analysis, GPT-4o mini for routing |
| Market data | Polymarket public API |
| Free research | Wikipedia API, DuckDuckGo, Google News |
| Backend | Node.js, TypeScript |
| Frontend | HTML, CSS, JavaScript |

---

## Setup

Full beginner-friendly instructions are in [SETUP.md](./SETUP.md).

Quick version:

```bash
git clone https://github.com/kamitakami687/polyarc.git
cd polyarc
npm install
cp .env.example .env
# Add your CIRCLE_API_KEY and OPENAI_API_KEY to .env
npm start
```

You need two API keys:

- `CIRCLE_API_KEY` — free from [console.circle.com](https://console.circle.com)
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com) (add $5 credit)

Never commit your `.env` file — it is already protected by `.gitignore`.

---

## Security Notes

- **Agent wallet is developer-controlled.** Circle's MPC technology means no raw private key is ever exposed in code.
- **Budget is enforced server-side.** The frontend cannot override the $0.10 session cap.
- **Testnet only.** All USDC is test currency. No real money is at risk.
- **x402 payments are signed fresh each time.** No standing payment authorization — every call requires a new signature.
- **API keys live in environment variables.** Never hardcoded anywhere in the source.

---

## Roadmap

- Multi-market mode — research several Polymarket questions in one session with shared budget
- Provider routing — compare two AI providers per query and pick the cheaper one
- Sub-cent payments via Circle Nanopayments batching (currently $0.05, target $0.001)
- Portfolio tracker for users with active Polymarket positions
- Arc Mainnet when available

---

## Submission

Built for the **Canteen x Arc Hackathon** — deadline July 6, 2026.

- **GitHub:** [github.com/kamitakami687/polyarc](https://github.com/kamitakami687/polyarc)
- **Demo video:** *(add your Loom link here)*
- **Live demo:** *(add your Replit link here)*

---

## About

PolyArc is a working testnet demo of autonomous AI payments on Arc Testnet.

The core idea is simple: an agent that discovers, evaluates, and pays for information — but only when the value of that information is worth the cost. That principle applies to prediction markets today, and to any paywalled data source tomorrow.
