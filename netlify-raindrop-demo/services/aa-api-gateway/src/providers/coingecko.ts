import type { QuoteProvider, VenueQuote } from "./types";
import { LRU } from "../shared/lru";

const BASE = process.env.COINGECKO_BASE ?? "https://api.coingecko.com/api/v3";
const cache = new LRU<string, any>({ max: 128, ttlMs: 10000 });

async function cg(url: string) {
  return cache.wrap(url, async () => {
    const r = await fetch(url);
    if (r.status === 429) await new Promise((r) => setTimeout(r, 1000));
    return r.json();
  });
}

export const CoinGeckoProvider: QuoteProvider = {
  name: "coingecko",
  supports: (chain: string, pair: string) => {
    // Only support major chains and common pairs
    return ["ethereum", "polygon", "arbitrum"].includes(chain);
  },
  async fetchQuotes({ chain, pair, sizeUsd }): Promise<VenueQuote[]> {
    // Simplified implementation - in production, map pair to CoinGecko IDs
    // For now, return empty array as this is a fallback provider
    return [];
  }
};
