import { GatewayClient } from "@circle-fin/x402-batching/client";
import { fileURLToPath } from "url";

const BUDGET_USDC = 0.10;
const PREMIUM_COST_USDC = 0.05;

export interface MarketOutcome {
  outcome: string;
  probability: number;
}

export interface PolymarketEntry {
  id: string;
  question: string;
  outcomes: MarketOutcome[];
  volume: number;
  endDate: string;
  url: string;
}

export interface ResearchSource {
  source: string;
  url: string;
  summary: string;
}

export interface PaymentRecord {
  endpoint: string;
  amountUsdc: string;
  settlementId?: string;
  purpose: string;
}

export interface ResearchReport {
  topic: string;
  markets: PolymarketEntry[];
  freeResearch: ResearchSource[];
  premiumAnalysis: string | null;
  payments: PaymentRecord[];
  initialAssessment: string;
  verdict: string;
  isMispriced: boolean | null;
  confidence: "high" | "medium" | "low";
  budgetUsedUsdc: number;
  budgetRemainingUsdc: number;
}

export async function fetchPolymarketMarkets(topic: string): Promise<PolymarketEntry[]> {
  try {
    const url = `https://gamma-api.polymarket.com/markets?keyword=${encodeURIComponent(topic)}&active=true&limit=5&order=volume&ascending=false`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as any[];
    return data.slice(0, 5).map((m) => {
      let outcomes: string[] = [];
      let prices: string[] = [];
      try { outcomes = JSON.parse(m.outcomes || "[]"); } catch {}
      try { prices = JSON.parse(m.outcomePrices || "[]"); } catch {}
      return {
        id: String(m.id),
        question: m.question || "",
        outcomes: outcomes.map((o, i) => ({
          outcome: o,
          probability: parseFloat(prices[i] || "0") * 100,
        })),
        volume: m.volumeNum || parseFloat(m.volume) || 0,
        endDate: m.endDate || "",
        url: `https://polymarket.com/market/${m.slug || m.id}`,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchWikipedia(topic: string): Promise<ResearchSource | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&format=json&srlimit=1&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as any;
    const results = searchData.query?.search ?? [];
    if (!results.length) return null;
    const title = results[0].title;
    const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const extRes = await fetch(extractUrl);
    const extData = (await extRes.json()) as any;
    const pages = Object.values(extData.query?.pages ?? {}) as any[];
    const extract = (pages[0]?.extract || results[0].snippet?.replace(/<[^>]*>/g, "") || "").trim();
    if (!extract) return null;
    return {
      source: "Wikipedia",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      summary: extract.slice(0, 1500),
    };
  } catch {
    return null;
  }
}

export async function fetchDuckDuckGo(topic: string): Promise<ResearchSource | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(topic)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = (data.AbstractText || data.Answer || "").trim();
    if (!text) return null;
    return {
      source: "DuckDuckGo",
      url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(topic)}`,
      summary: text,
    };
  } catch {
    return null;
  }
}

export async function fetchGoogleNews(topic: string): Promise<ResearchSource | null> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>|<title>([^<]+)<\/title>/g)]
      .map((m) => (m[1] || m[2] || "").trim())
      .filter((t) => !t.toLowerCase().includes("google news") && t.length > 10)
      .slice(0, 6);
    if (!titles.length) return null;
    return {
      source: "Google News",
      url: `https://news.google.com/search?q=${encodeURIComponent(topic)}`,
      summary: "Recent headlines: " + titles.join(" • "),
    };
  } catch {
    return null;
  }
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  model = "gpt-4o-mini"
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content ?? "";
}

function mkMarketsSummary(markets: PolymarketEntry[]): string {
  if (!markets.length) return "(no matching markets found on Polymarket)";
  return markets
    .map((m) => {
      const odds = m.outcomes.map((o) => `${o.outcome}: ${o.probability.toFixed(1)}%`).join(", ");
      return `• "${m.question}"\n  Volume: $${Number(m.volume).toLocaleString()} | ${odds} | Closes: ${m.endDate.slice(0, 10)}`;
    })
    .join("\n");
}

function mkSourcesSummary(sources: ResearchSource[]): string {
  if (!sources.length) return "(no free research found)";
  return sources.map((s) => `[${s.source}]\n${s.summary.slice(0, 600)}`).join("\n\n---\n\n");
}

export async function runInitialAssessment(
  topic: string,
  markets: PolymarketEntry[],
  sources: ResearchSource[]
): Promise<{ summary: string; needsPremiumData: boolean; confidence: "high" | "medium" | "low" }> {
  const prompt = `Topic: "${topic}"

Polymarket prediction markets:
${mkMarketsSummary(markets)}

Free research:
${mkSourcesSummary(sources)}

Reply with JSON only:
{
  "summary": "2-3 sentence summary of what the data shows about this topic",
  "needsPremiumData": true or false,
  "confidence": "high" or "medium" or "low"
}

Set needsPremiumData=true if the free sources are insufficient to confidently assess whether the market odds are accurate.`;

  const raw = await callOpenAI(
    "You are a prediction market research analyst. Reply with valid JSON only — no prose outside the JSON object.",
    prompt,
    "gpt-4o-mini"
  );

  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return { summary: raw, needsPremiumData: false, confidence: "low" };
}

export async function runDeepAnalysis(
  topic: string,
  markets: PolymarketEntry[],
  sources: ResearchSource[]
): Promise<string> {
  const prompt = `You are conducting a PREMIUM deep analysis of a prediction market.

Topic: "${topic}"

Current Polymarket odds:
${mkMarketsSummary(markets)}

Background research:
${mkSourcesSummary(sources)}

Provide a thorough 4-6 paragraph analysis:
1. What the current odds imply about each outcome's probability
2. Key factors and recent developments that could affect the outcome
3. Whether the market odds appear accurate, overpriced, or underpriced — and why
4. Specific risks or catalysts the market may be mispricing
5. Your conclusion with a confidence level

Reference specific probability numbers. Be direct and analytical about potential mispricings.`;

  return callOpenAI(
    "You are an expert prediction market analyst with deep knowledge of politics, economics, sports, and current events. Provide rigorous, evidence-based analysis. Reference specific odds and explain your reasoning clearly.",
    prompt,
    "gpt-4o"
  );
}

export async function runResearch(
  topic: string,
  options: { serverUrl: string; onProgress?: (step: string) => void }
): Promise<ResearchReport> {
  const { serverUrl, onProgress } = options;
  const emit = (msg: string) => onProgress?.(msg);

  let budgetUsedUsdc = 0;
  const payments: PaymentRecord[] = [];

  emit("Searching Polymarket for matching markets…");
  const markets = await fetchPolymarketMarkets(topic);

  emit(`Found ${markets.length} market(s). Fetching free research sources…`);
  const [wiki, ddg, news] = await Promise.all([
    fetchWikipedia(topic),
    fetchDuckDuckGo(topic),
    fetchGoogleNews(topic),
  ]);
  const freeResearch: ResearchSource[] = [wiki, ddg, news].filter(Boolean) as ResearchSource[];

  emit(`Collected ${freeResearch.length} free source(s). Running initial AI assessment (gpt-4o-mini)…`);
  const initial = await runInitialAssessment(topic, markets, freeResearch);

  let premiumAnalysis: string | null = null;
  const canAfford = budgetUsedUsdc + PREMIUM_COST_USDC <= BUDGET_USDC;
  const privateKey = process.env.PRIVATE_KEY as `0x${string}` | undefined;

  if (initial.needsPremiumData && canAfford) {
    if (privateKey) {
      emit(`Confidence is "${initial.confidence}" — paying $${PREMIUM_COST_USDC} USDC via x402 for premium gpt-4o analysis…`);
      try {
        const client = new GatewayClient({ chain: "arcTestnet", privateKey });
        const url = `${serverUrl}/premium/analyze-market?topic=${encodeURIComponent(topic)}`;
        const result = await client.pay(url);
        if (result.status === 200 && result.data) {
          const body = result.data as any;
          premiumAnalysis = body.analysis ?? JSON.stringify(body);
          budgetUsedUsdc += PREMIUM_COST_USDC;
          payments.push({
            endpoint: "/premium/analyze-market",
            amountUsdc: `$${PREMIUM_COST_USDC.toFixed(2)}`,
            settlementId: (result as any).settlementId,
            purpose: "Premium gpt-4o deep market analysis",
          });
          emit("Premium analysis received ✓");
        }
      } catch (err) {
        const msg = (err as Error).message?.slice(0, 100) ?? String(err);
        emit(`x402 payment failed (${msg}) — running deep analysis directly…`);
        premiumAnalysis = await runDeepAnalysis(topic, markets, freeResearch);
      }
    } else {
      emit(`Confidence is "${initial.confidence}" — running deep analysis with gpt-4o (no wallet configured)…`);
      premiumAnalysis = await runDeepAnalysis(topic, markets, freeResearch);
    }
  }

  emit("Synthesizing final verdict…");
  const verdictPrompt = `Topic: "${topic}"

${markets.length ? `Polymarket odds:\n${mkMarketsSummary(markets)}` : "(no Polymarket markets found)"}

Initial assessment: ${initial.summary}
${premiumAnalysis ? `\nDeep analysis:\n${premiumAnalysis.slice(0, 2000)}` : ""}

Write a concise verdict (2-3 sentences) on whether this market appears accurately priced or mispriced, and in which direction. Be specific.`;

  const verdict = await callOpenAI(
    "You are a prediction market analyst. Give a direct, specific verdict on market pricing.",
    verdictPrompt,
    "gpt-4o-mini"
  );

  let isMispriced: boolean | null = null;
  try {
    const check = await callOpenAI(
      `Reply with JSON only: {"isMispriced": true or false}`,
      `Based on this verdict, is the prediction market mispriced? "${verdict}"`,
      "gpt-4o-mini"
    );
    const m = check.match(/\{[\s\S]*\}/);
    if (m) isMispriced = (JSON.parse(m[0]) as any).isMispriced ?? null;
  } catch {}

  emit("Research complete.");

  return {
    topic,
    markets,
    freeResearch,
    premiumAnalysis,
    payments,
    initialAssessment: initial.summary,
    verdict,
    isMispriced,
    confidence: initial.confidence,
    budgetUsedUsdc,
    budgetRemainingUsdc: BUDGET_USDC - budgetUsedUsdc,
  };
}

// CLI entry point — only runs when executed directly
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const topic = process.argv[2];
  if (!topic) {
    console.error('Usage: npx tsx research-agent.ts "your topic or question"');
    process.exit(1);
  }
  console.log(`\n🔍 Researching: "${topic}"\n`);
  runResearch(topic, {
    serverUrl: `http://localhost:${process.env.PORT || 5000}`,
    onProgress: (msg) => console.log(`  ⟳ ${msg}`),
  })
    .then((report) => {
      console.log("\n📊 RESEARCH REPORT");
      console.log("=".repeat(60));

      if (report.markets.length) {
        console.log("\n📈 Polymarket Markets:");
        for (const m of report.markets) {
          console.log(`  "${m.question}"`);
          for (const o of m.outcomes) {
            console.log(`    ${o.outcome}: ${o.probability.toFixed(1)}%`);
          }
        }
      } else {
        console.log("\n📈 No Polymarket markets found for this topic.");
      }

      if (report.freeResearch.length) {
        console.log(`\n📚 Free Sources: ${report.freeResearch.map((s) => s.source).join(", ")}`);
      }

      if (report.payments.length) {
        console.log("\n💳 x402 Payments Made:");
        for (const p of report.payments) {
          console.log(`  ${p.amountUsdc} → ${p.endpoint} (${p.purpose})`);
          if (p.settlementId) console.log(`    Settlement ID: ${p.settlementId}`);
        }
      }

      console.log(`\n🎯 Verdict: ${report.verdict}`);
      console.log(`Mispriced: ${report.isMispriced === null ? "unknown" : report.isMispriced ? "YES ⚠️" : "NO ✓"}`);
      console.log(`Confidence: ${report.confidence}`);
      console.log(`Budget: $${report.budgetUsedUsdc.toFixed(2)} used / $${BUDGET_USDC.toFixed(2)} total`);
    })
    .catch((err) => {
      console.error("Research failed:", err);
      process.exit(1);
    });
}
