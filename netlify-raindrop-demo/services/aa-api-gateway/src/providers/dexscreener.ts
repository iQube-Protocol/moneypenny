import type { QuoteProvider, VenueQuote } from "./types";
import { LRU } from "../shared/lru";

const BASE = process.env.DEXSCREENER_BASE ?? "https://api.dexscreener.com/latest/dex";
const cache = new LRU<string, any>({ max: 256, ttlMs: 3000 });

async function ds(url: string) {
  return cache.wrap(url, async () => {
    const r = await fetch(url);
    if (r.status === 429) await new Promise((r) => setTimeout(r, 500));
    return r.json();
  });
}

export const DexScreenerProvider: QuoteProvider = {
  name: "dexscreener",
  supports: () => true,
  async fetchQuotes({ chain, pair, sizeUsd }): Promise<VenueQuote[]> {
    const url = `${BASE}/search?q=${encodeURIComponent(pair)}`;
    const j = await ds(url);
    const gas =
      ({
        ethereum: 2.5,
        arbitrum: 0.15,
        base: 0.1,
        optimism: 0.14,
        polygon: 0.05,
        solana: 0.01,
        bitcoin: 0.5
      } as any)[chain] ?? 0.25;
    return (j.pairs ?? []).slice(0, 3).map((p: any) => ({
      venue: p.dexId || "dex",
      chain: p.chainId || chain,
      pair: p.pairAddress || pair,
      mid: +p.priceUsd,
      bid: +p.priceUsd - 0.000001,
      ask: +p.priceUsd + 0.000001,
      fee_bps: 1.0,
      est_gas_usd: gas,
      ts: new Date().toISOString()
    }));
  }
};
