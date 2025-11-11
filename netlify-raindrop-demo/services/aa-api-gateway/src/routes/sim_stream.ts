import type { Request, Response } from "express";
import crypto from "crypto";

const DEFAULT_CHAINS = ["ethereum", "arbitrum", "base", "polygon", "solana"];
const PEG_USD = 0.01;

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getSimStream(req: Request, res: Response) {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const send = (o: any) => res.write(`data: ${JSON.stringify(o)}\n\n`);

  let alive = true;
  req.on("close", () => {
    alive = false;
    console.log("SSE client disconnected");
  });

  // Parse selected chains portfolio
  const chains = String(req.query.chains || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const portfolio = chains.length ? chains : DEFAULT_CHAINS;

  // Per-chain running state
  const state: Record<
    string,
    { cumCaptureBps: number; turnover: number; intentCount: number; fillCount: number }
  > = {};
  for (const c of portfolio) {
    state[c] = { cumCaptureBps: 0, turnover: 0, intentCount: 0, fillCount: 0 };
  }

  console.log("SSE simulation stream started - portfolio:", portfolio.join(", "));

  function pulse() {
    if (!alive) return;

    // Pick a chain for this pulse
    const chain = pick(portfolio);
    const pair = "QCT/USDC";
    const sizeUsd = 500 + Math.random() * 4500; // $500–$5k

    // Pseudo quote edge/floor
    const baseEdge = Math.max(0, 0.8 + (Math.random() - 0.5) * 0.8); // ~0.4–1.2 bps
    const floorBps = 0.5; // Sim floor (Live uses gas oracle)

    send({
      ts: new Date().toISOString(),
      status: "QUOTE",
      chain,
      pair,
      size_usd: +sizeUsd.toFixed(2),
      floor_bps: +floorBps.toFixed(2),
      edge_bps: +baseEdge.toFixed(2),
      peg_usd: PEG_USD,
    });

    // Sometimes submit + fill on this chain
    if (Math.random() < 0.35) {
      const id = crypto.randomUUID();
      state[chain].intentCount++;
      send({
        ts: new Date().toISOString(),
        status: "INTENT_SUBMITTED",
        chain,
        pair,
        intent_id: id,
        intent_number: state[chain].intentCount,
      });

      // Simulate fill after short delay
      setTimeout(() => {
        if (!alive) return;

        const qty = +(50 + Math.random() * 300).toFixed(2);
        const price = +(PEG_USD + (Math.random() - 0.5) * 0.00002).toFixed(5);
        const side = Math.random() < 0.5 ? "BUY" : "SELL";
        const fee = +(0.05 + Math.random() * 0.10).toFixed(2);
        const gas = +(0.05 + Math.random() * 0.10).toFixed(2);

        state[chain].fillCount++;

        const notionalUsd = qty * price;

        send({
          ts: new Date().toISOString(),
          status: "FILL",
          chain,
          pair,
          side,
          qty_qct: qty,
          price_usdc: price,
          fee_usdc: fee,
          gas_usd: gas,
          notional_usd: +notionalUsd.toFixed(2),
        });

        // Capture after floor
        const capture = +(Math.max(0, baseEdge - floorBps)).toFixed(2);
        state[chain].cumCaptureBps = +(state[chain].cumCaptureBps + capture).toFixed(2);
        state[chain].turnover = +(state[chain].turnover + notionalUsd).toFixed(2);

        send({
          ts: new Date().toISOString(),
          status: "P&L",
          chain,
          pair,
          capture_bps: capture,
          cum_capture_bps: state[chain].cumCaptureBps,
          turnover: state[chain].turnover,
          notional_usd: +notionalUsd.toFixed(2),
          peg_usd: PEG_USD,
          fill_count: state[chain].fillCount,
        });
      }, 200 + Math.random() * 300);
    }

    // Next pulse in 400ms-1300ms
    setTimeout(pulse, 400 + Math.random() * 900);
  }

  // Keep-alive pings
  const ping = setInterval(() => {
    if (alive) res.write(":\n\n");
    else clearInterval(ping);
  }, 15000);

  // Start the pulse
  pulse();

  // Send initial message
  send({
    ts: new Date().toISOString(),
    status: "CONNECTED",
    mode: "SIMULATION",
    message: "MoneyPenny HFT Simulation Stream Active",
    portfolio,
  });
}
