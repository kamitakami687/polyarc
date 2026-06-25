# PolyArc — Setup Guide

Written for complete beginners. No coding experience assumed.

---

## What you need before you start

- A computer running macOS, Linux, or Windows
- [Node.js 20 or later](https://nodejs.org/) installed
- A free Circle developer account
- An OpenAI account with at least $5 credit

---

## Step 1 — Install Node.js

Go to [nodejs.org](https://nodejs.org/) and download the **LTS** version (20 or later).

Verify it installed correctly:

```bash
node --version   # should print v20.x.x or higher
npm --version
```

---

## Step 2 — Clone the repo

```bash
git clone https://github.com/kamitakami687/polyarc.git
cd polyarc
npm install
```

---

## Step 3 — Get your Circle API key

1. Go to [console.circle.com](https://console.circle.com) and sign in
2. In the left sidebar, click **API Keys**
3. Click **Create a Key** → choose **Standard Key**
4. Give it a name like `polyarc-key`
5. Copy the key immediately — Circle only shows it once

---

## Step 4 — Get your OpenAI API key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and sign in
2. Click **Create new secret key**
3. Give it a name like `polyarc`
4. Copy it immediately
5. Go to **Settings → Billing** and make sure you have at least $5 credit loaded

---

## Step 5 — Create your `.env` file

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in:

```
CIRCLE_API_KEY=your_circle_key_here
OPENAI_API_KEY=your_openai_key_here
```

Never share or commit this file — it is already protected by `.gitignore`.

---

## Step 6 — Fund the agent wallet with test USDC

Your agent needs test USDC to make autonomous payments. This is free — testnet currency, not real money.

1. Start the server once to generate the agent wallet address:

```bash
npm start
```

2. Look in the terminal output for a line like:

```
Agent wallet: 0x7ee7AD4c...
```

3. Copy that address
4. Go to [faucet.circle.com](https://faucet.circle.com)
5. Select **Arc Testnet** as the network
6. Paste your wallet address and click **Request**
7. Wait about 30 seconds for the funds to arrive

---

## Step 7 — Run the project

```bash
npm start
```

Then open your browser and go to:

```
http://localhost:5000
```

You should see the PolyArc research interface.

---

## Step 8 — Test it

1. Click one of the suggested topics (e.g. **Bitcoin $200k**)
2. Click **Research**
3. Watch it search free sources first
4. If it triggers a premium payment, you will see **Premium Analysis · $0.05 via x402** appear
5. Click the **Payment Trace** tab to see the on-chain payment record

---

## Troubleshooting

**"OpenAI 429 error"** — Your OpenAI account is out of credit. Go to [platform.openai.com](https://platform.openai.com) → Settings → Billing and add $5.

**"Wallet not funded"** — Go to [faucet.circle.com](https://faucet.circle.com) and request test USDC on Arc Testnet.

**"Cannot find module"** — Run `npm install` again from the project folder.

**Port already in use** — Kill whatever is on port 5000 or set a different port: `PORT=3001 npm start`

---

## Environment variables reference

| Variable | Where to get it | Required |
|---|---|---|
| `CIRCLE_API_KEY` | [console.circle.com](https://console.circle.com) → API Keys | Yes |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Yes |

---

## Arc Testnet resources

- Faucet (free test USDC): [faucet.circle.com](https://faucet.circle.com)
- Block explorer: [explorer.testnet.arc.network](https://explorer.testnet.arc.network)
- x402 docs: [developers.circle.com/stablecoins/docs/arc-testnet](https://developers.circle.com/stablecoins/docs/arc-testnet)

---

## Need help?

- Canteen Discord: [discord.gg/rsVfYutFZg](https://discord.gg/rsVfYutFZg)
- Arc builder Discord: [discord.com/invite/buildonarc](https://discord.com/invite/buildonarc)
