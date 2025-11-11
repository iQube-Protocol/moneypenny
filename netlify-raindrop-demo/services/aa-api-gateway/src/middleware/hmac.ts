import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function requireHmacSignature(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.WEBHOOK_HMAC_SECRET;
  if (!secret) return res.status(500).json({ error: "hmac_secret_not_configured" });

  const tsHeader = req.header("X-Timestamp");
  const sigHeader = req.header("X-Signature");
  if (!tsHeader || !sigHeader) return res.status(401).json({ error: "missing_hmac_headers" });

  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) return res.status(400).json({ error: "bad_timestamp" });

  const tolerance = Number(process.env.WEBHOOK_TOLERANCE_SECONDS || 300);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) {
    return res.status(401).json({ error: "timestamp_out_of_window" });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) return res.status(400).json({ error: "raw_body_required" });

  const payload = Buffer.concat([Buffer.from(String(ts)), Buffer.from("."), rawBody]);
  const expected = crypto.createHmac("sha256", Buffer.from(secret)).update(payload).digest("hex");

  const ok = timingSafeEqual(sigHeader, expected);
  if (!ok) return res.status(401).json({ error: "invalid_signature" });

  return next();
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
