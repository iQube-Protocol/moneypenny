import type { Request, Response } from "express";
import { q } from "../db";

export async function postAigentZWebhook(req: Request, res: Response) {
  try {
    // Parse JSON from raw body buffer
    const rawBody = (req as any).rawBody as Buffer;
    const payload = JSON.parse(rawBody.toString('utf-8'));

    // Expected payload format:
    // {
    //   intent_id: string,
    //   status: "ACCEPTED" | "REJECTED" | "PARTIAL_FILL" | "FILLED",
    //   tx_hash?: string,
    //   fill?: { chain, venue, side, qty_qct, price_usdc, fee_usdc, gas_usd }
    // }

    const { intent_id, status, tx_hash, fill } = payload;

    if (!intent_id || !status) {
      return res.status(400).json({ error: "missing_required_fields" });
    }

    // Insert event
    await q(
      `INSERT INTO intent_events (intent_id, status, tx_hash, raw)
       VALUES ($1, $2, $3, $4)`,
      [intent_id, status, tx_hash || null, JSON.stringify(payload)]
    );

    // If there's a fill, insert into fills table
    if (fill && status === "FILLED") {
      await q(
        `INSERT INTO fills (intent_id, chain, venue, side, qty_qct, price_usdc, fee_usdc, gas_usd, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          intent_id,
          fill.chain,
          fill.venue,
          fill.side,
          fill.qty_qct,
          fill.price_usdc,
          fill.fee_usdc || 0,
          fill.gas_usd || 0,
          tx_hash || null
        ]
      );

      // Trigger telemetry rollup (stub - in production, use background task)
      console.log(`Fill received for intent ${intent_id}, should trigger rollup`);
    }

    return res.json({ success: true, intent_id, status });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ error: "internal_error" });
  }
}
