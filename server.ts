import express from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { formatUnits } from "viem";
import { decodeBatch } from "./decode-batch.ts";
import {
  runResearch,
  runDeepAnalysis,
  fetchPolymarketMarkets,
  fetchWikipedia,
  fetchDuckDuckGo,
  fetchGoogleNews,
} from "./research-agent.ts";

type PaidRequest = express.Request & {
  payment?: {
    verified: boolean;
    payer: string;
    amount: string;
    network: string;
    transaction?: string;
  };
};

const SELLER = "0x933a2405f84c224be1ef373ba16e992e1f459682";

const app = express();
app.use(express.json());

app.get("/", (_req, res) => res.redirect("/research.html"));
app.use(express.static("public"));

const gateway = createGatewayMiddleware({
  sellerAddress: SELLER,
  facilitatorUrl: "https://gateway-api-testnet.circle.com",
  networks: ["eip155:5042002"],
});

app.get("/hello-world", gateway.require("$0.01"), (req: PaidRequest, res) => {
  const { payer, amount, network, transaction } = req.payment!;
  const formatted = formatUnits(BigInt(amount), 6);
  console.log(`paid ${formatted} USDC by ${payer} on ${network} settlement=${transaction ?? "?"}`);
  res.json({
    message: "hello, world — you paid for this",
    paid_by: payer,
    amount_usdc: formatted,
    network,
    settlementId: transaction,
  });
});

// Premium research endpoint — paywalled at $0.05 via x402
app.get("/premium/analyze-market", gateway.require("$0.05"), async (req: PaidRequest, res) => {
  const topic = String(req.query.topic ?? "").trim();
  if (!topic) {
    res.status(400).json({ error: "topic query param required" });
    return;
  }
  try {
    const payer = req.payment?.payer ?? "unknown";
    const settlementId = req.payment?.transaction;
    console.log(`premium analysis: "${topic}" paid by ${payer} settlement=${settlementId ?? "?"}`);

    const [markets, wiki, ddg, news] = await Promise.all([
      fetchPolymarketMarkets(topic),
      fetchWikipedia(topic),
      fetchDuckDuckGo(topic),
      fetchGoogleNews(topic),
    ]);
    const sources = [wiki, ddg, news].filter(Boolean) as NonNullable<typeof wiki>[];
    const analysis = await runDeepAnalysis(topic, markets, sources);
    res.json({ analysis, marketCount: markets.length, sourceCount: sources.length, settlementId });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message ?? e) });
  }
});

// Research SSE stream — send progress events then final report
app.get("/api/research", async (req, res) => {
  const topic = String(req.query.topic ?? "").trim();
  if (!topic) {
    res.status(400).json({ error: "topic query param required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const PORT_NUM = Number(process.env.PORT) || 5000;
    const report = await runResearch(topic, {
      serverUrl: `http://localhost:${PORT_NUM}`,
      onProgress: (step) => send("progress", { step }),
    });
    send("report", report);
  } catch (e) {
    send("error", { message: String((e as Error).message ?? e) });
  }

  res.end();
});

const GATEWAY_API = "https://gateway-api-testnet.circle.com";
const ARC_EXPLORER = "https://testnet.arcscan.app";
const GATEWAY_WALLET = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

const PINNED_BATCH_TX: Record<string, `0x${string}`> = {
  "c9933054-6b34-44bb-8c04-e7e9e1b8352c":
    "0xfbad1baae7fd9b88f4e1b034a4236da02012870acbd6ae83b583e85528be396e",
};

app.get("/api/settlement/:id", async (req, res) => {
  const r = await fetch(`${GATEWAY_API}/v1/x402/transfers/${req.params.id}`);
  res.status(r.status).type("application/json").send(await r.text());
});

app.get("/api/decode-batch/:hash", async (req, res) => {
  try {
    const decoded = await decodeBatch(req.params.hash as `0x${string}`);
    res.json({
      ...decoded,
      blockNumber: decoded.blockNumber.toString(),
      entries: decoded.entries.map((e) => ({
        address: e.address,
        deltaRaw: e.delta.toString(),
        usdc: e.usdc,
      })),
    });
  } catch (e) {
    res.status(400).json({ error: String((e as Error).message ?? e) });
  }
});

app.get("/api/batch-tx/:id", async (req, res) => {
  const sr = await fetch(`${GATEWAY_API}/v1/x402/transfers/${req.params.id}`);
  if (!sr.ok) {
    res.status(sr.status).send(await sr.text());
    return;
  }
  const settlement = (await sr.json()) as { status: string; updatedAt: string };
  if (settlement.status !== "completed" && settlement.status !== "confirmed") {
    res.json({ batchTx: null, status: settlement.status });
    return;
  }
  const pinned = PINNED_BATCH_TX[req.params.id];
  if (pinned) {
    res.json({
      batchTx: pinned,
      status: settlement.status,
      explorerUrl: `${ARC_EXPLORER}/tx/${pinned}`,
    });
    return;
  }
  const tr = await fetch(
    `${ARC_EXPLORER}/api/v2/addresses/${GATEWAY_WALLET}/transactions?filter=to`,
  );
  const { items } = (await tr.json()) as {
    items: { hash: string; timestamp: string; method: string | null }[];
  };
  const updatedAt = new Date(settlement.updatedAt).getTime();
  const candidate = items.find(
    (t) =>
      t.method === "submitBatch" &&
      new Date(t.timestamp).getTime() <= updatedAt + 5_000,
  );
  res.json({
    batchTx: candidate?.hash ?? null,
    status: settlement.status,
    explorerUrl: candidate ? `${ARC_EXPLORER}/tx/${candidate.hash}` : null,
  });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`listening on http://localhost:${PORT}`);
  console.log(`seller: ${SELLER}`);
  console.log(`wallet: ${process.env.PRIVATE_KEY ? "configured" : "not set (x402 payments disabled)"}`);
  console.log(`openai: ${process.env.OPENAI_API_KEY ? "configured" : "not set"}`);
});
