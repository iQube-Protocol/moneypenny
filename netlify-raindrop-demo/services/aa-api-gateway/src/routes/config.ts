import type { Request, Response } from "express";
import { getEffectiveConfig } from "../policy/effective";

export async function getConfig(req: Request, res: Response) {
  const tenantId = (req as any).tenantId;
  if (!tenantId) return res.status(500).json({ error: "tenant_missing_in_context" });

  const cfg = await getEffectiveConfig(tenantId);
  return res.json({ tenant_id: tenantId, effective: cfg });
}
