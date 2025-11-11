import type { Request, Response, NextFunction } from "express";
import { q } from "../db";

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    // Support both header and query param (query param for SSE where headers aren't supported in EventSource)
    const apiKey = req.header("X-Api-Key") || req.header("x-api-key") || (req.query.k as string);
    if (!apiKey) return res.status(401).json({ error: "missing_api_key" });

    const { rows } = await q<{ tenant_id: string }>(
      "SELECT tenant_id FROM tenant_api_keys WHERE api_key=$1 AND is_active=true LIMIT 1",
      [apiKey]
    );

    const tenantId = rows[0]?.tenant_id;
    if (!tenantId) return res.status(403).json({ error: "invalid_api_key" });

    (req as any).tenantId = tenantId;
    return next();
  } catch (e) {
    return res.status(500).json({ error: "internal_error" });
  }
}
