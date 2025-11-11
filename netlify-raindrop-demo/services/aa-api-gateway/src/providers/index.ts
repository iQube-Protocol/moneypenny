import type { VenueQuote, QuoteProvider } from "./types";
import { DexScreenerProvider } from "./dexscreener";

const providers: QuoteProvider[] = [DexScreenerProvider];

export async function aggregatedQuotes(args: { chain: string; pair: string; sizeUsd: number }) {
  const all: VenueQuote[] = [];
  for (const p of providers) {
    if (!p.supports(args.chain, args.pair)) continue;
    try {
      all.push(...(await p.fetchQuotes(args)));
    } catch {}
  }
  return dedupe(all);
}

function dedupe(list: VenueQuote[]) {
  const m = new Map<string, VenueQuote>();
  for (const q of list) if (!m.has(q.venue)) m.set(q.venue, q);
  return [...m.values()];
}
