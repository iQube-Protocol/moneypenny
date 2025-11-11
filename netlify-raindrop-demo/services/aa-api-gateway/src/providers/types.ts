export type VenueQuote = {
  venue: string;
  chain: string;
  pair: string;
  bid: number;
  ask: number;
  mid: number;
  fee_bps: number;
  est_gas_usd: number;
  ts: string;
};

export interface QuoteProvider {
  name: string;
  supports(chain: string, pair: string): boolean;
  fetchQuotes(args: { chain: string; pair: string; sizeUsd: number }): Promise<VenueQuote[]>;
}
