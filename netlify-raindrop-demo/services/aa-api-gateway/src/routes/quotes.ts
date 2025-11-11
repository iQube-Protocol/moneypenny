import type { Request, Response } from "express";
import { aggregatedQuotes } from "../providers";
import { loadPolicy } from "../policy/policy";

type Q = {
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

function edgeBps(buy: Q, sell: Q, sizeUsd: number) {
  const peg = 0.01;
  const gross = ((sell.bid - buy.ask) / peg) * 10_000;
  const fees = buy.fee_bps + sell.fee_bps;
  const gasBps = ((buy.est_gas_usd + sell.est_gas_usd) / Math.max(1, sizeUsd)) * 10_000;
  return +(gross - fees - gasBps - 0.5).toFixed(4);
}

function pickBest(quotes: Q[], sizeUsd: number) {
  let best: any = null;
  for (const b of quotes) {
    for (const s of quotes) {
      if (b.venue === s.venue) continue;
      const e = edgeBps(b, s, sizeUsd);
      if (!best || e > best.edge_bps) {
        best = {
          buy_venue: b.venue,
          sell_venue: s.venue,
          edge_bps: e,
          buy_pool_address: b.pair,
          sell_pool_address: s.pair,
          buy_price: b.ask,
          sell_price: s.bid
        };
      }
    }
  }
  return best;
}

function nearFloor(edge: number) {
  return edge <= 1.3;
}

export async function getQuotes(req: Request, res: Response) {
  try {
    const chain = String(req.query.chain || "").toLowerCase();
    if (!chain) return res.status(400).json({ error: "chain required" });

    const venues = typeof req.query.venues === "string" ? String(req.query.venues) : "";
    const sizeUsd = Math.max(1, Number(req.query.size_usd) || 1000);

    const pair = "QCT/USDC";
    const quotes = await aggregatedQuotes({ chain, pair, sizeUsd });

    // Enrich with floor calculations
    const policy = loadPolicy();
    const enriched = quotes.map((q) => {
      const totalCostBps = q.fee_bps + (q.est_gas_usd / sizeUsd) * 10_000;
      const minEdgeBps = policy.risk.min_edge_bps;
      const floorBps = totalCostBps + minEdgeBps;

      return {
        ...q,
        total_cost_bps: +totalCostBps.toFixed(4),
        floor_bps: +floorBps.toFixed(4),
        verified: false
      };
    });

    const best = pickBest(quotes as any, sizeUsd);

    // Optional: RPC verify if near floor
    let verified = false;
    if (best && nearFloor(best.edge_bps)) {
      // In production, call rpcVerify() here if you have pool addresses
      // verified = true;
    }

    return res.json({
      chain,
      peg_usd: 0.01,
      size_usd: sizeUsd,
      quotes: enriched,
      best_opportunity: best,
      verified,
      ts: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return res.status(500).json({ error: "failed_to_fetch_quotes" });
  }
}
