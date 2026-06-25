# PolyArc — Setup Guide

Written for complete beginners. No coding experience assumed.

---

## What you need before you start

- A computer with a web browser
- A free Replit account
- A free Circle developer account
- An OpenAI account with at least $5 credit

You do NOT need to install anything on your computer. Everything runs in your browser via Replit.

---

## Step 1 — Get your Circle API key

1. Go to [console.circle.com](https://console.circle.com) and sign in
2. In the left sidebar, click **API Keys**
3. Click **Create a Key** → choose **Standard Key**
4. Give it a name like `polyarc-key`
5. Copy the key immediately and paste it somewhere safe — Circle only shows it once

---

## Step 2 — Get your OpenAI API key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and sign in
2. Click **Create new secret key**
3. Give it a name like `polyarc`
4. Copy it immediately
5. Go to **Settings → Billing** and make sure you have at least $5 credit loaded

---

## Step 3 — Open the project in Replit

1. Go to [replit.com](https://replit.com) and sign in
2. Open your PolyArc project (already imported from GitHub)
3. You will see the Replit Agent chat in the middle of the screen

---

## Step 4 — Add your API keys as Secrets

In Replit, your API keys are stored as "Secrets" — they are encrypted and never visible in your code.

The Replit Agent will prompt you to enter them directly in the chat. When it asks:

- For **CIRCLE_API_KEY** → paste your Circle API key
- For **OPENAI_API_KEY** → paste your OpenAI API key

If it does not prompt you automatically, type this in the Replit Agent chat:

> "Add my Circle API key and OpenAI API key as secrets"

---

## Step 5 — Fund your agent wallet with test USDC

Your agent needs test USDC to make payments. This is free — it is not real money.

1. First run the project once so the agent wallet address is created
2. Copy the wallet address from the console output
3. Go to [faucet.circle.com](https://faucet.circle.com)
4. Paste your wallet address and request test USDC on Arc Testnet
5. Wait about 30 seconds for the funds to arrive

---

## Step 6 — Run the project

In the Replit Agent chat, type:

> "Run the project"

Or click the green **Run** button at the top of Replit.

You should see the PolyArc web interface appear on the right side of the screen.

---

## Step 7 — Test it

1. In the web interface, click one of the suggested topics (e.g. "Bitcoin $200k")
2. Click the **Research** button
3. Watch it search free sources first
4. If it triggers a premium payment, you will see "Premium Analysis · $0.05 via x402" appear
5. Click the **Payment Trace** tab to see the on-chain payment record

---

## Troubleshooting

**"OpenAI 429 error"** — Your OpenAI account is out of credit. Go to [platform.openai.com](https://platform.openai.com) → Settings → Billing and add $5.

**"Wallet not funded"** — Go to [faucet.circle.com](https://faucet.circle.com) and request test USDC for your wallet address.

**"Cannot find module"** — In the Replit Agent chat, type: "Run npm install"

**Anything else** — Take a screenshot and ask in the Canteen Discord. The team is active and helpful.

---

## Environment variables reference

| Variable | Where to get it | Required |
|---|---|---|
| `CIRCLE_API_KEY` | [console.circle.com](https://console.circle.com) → API Keys | Yes |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Yes |

---

## Need help?

- Canteen Discord: [discord.gg/rsVfYutFZg](https://discord.gg/rsVfYutFZg)
- Arc builder Discord: [discord.com/invite/buildonarc](https://discord.com/invite/buildonarc)
