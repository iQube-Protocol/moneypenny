import type { Request, Response } from "express";
import { q } from "../db";
import { z } from "zod";

const Body = z.object({
  tenant_id: z.string(),
  inventory_band: z.number().min(0.1),
  min_edge_bps: z.number().min(0),
  advisory: z.object({
    max_notional_usd_day: z.number().min(0),
    daily_loss_limit_bps: z.number().min(0)
  })
});

export async function postRecommendationsApply(req: Request, res: Response) {
  const parsed = Body.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "schema_invalid",
      details: parsed.error.flatten()
    });
  }

  const { tenant_id, inventory_band, min_edge_bps, advisory } = parsed.data;
  const callerTenant = (req as any).tenantId;

  if (!callerTenant) {
    return res.status(500).json({ error: "tenant_missing" });
  }

  if (callerTenant !== tenant_id) {
    return res.status(403).json({ error: "cross_tenant_forbidden" });
  }

  try {
    // Apply inventory_band
    await q(
      `INSERT INTO kv_runtime(tenant_id,key,value_num) VALUES ($1,'inventory_band',$2)
       ON CONFLICT (tenant_id,key) DO UPDATE SET value_num=EXCLUDED.value_num, updated_at=now()`,
      [tenant_id, inventory_band]
    );

    // Apply min_edge_bps
    await q(
      `INSERT INTO kv_runtime(tenant_id,key,value_num) VALUES ($1,'min_edge_bps',$2)
       ON CONFLICT (tenant_id,key) DO UPDATE SET value_num=EXCLUDED.value_num, updated_at=now()`,
      [tenant_id, min_edge_bps]
    );

    // Log advisory limits to governance log
    await q(
      `INSERT INTO governance_log(tenant_id,actor,action,details) VALUES ($1,$2,'APPLY_ADVISORY_LIMITS',$3::jsonb)`,
      [tenant_id, "MoneyPenny", JSON.stringify(advisory)]
    );

    // Get all current runtime overrides
    const { rows } = await q(
      `SELECT key, value_num FROM kv_runtime WHERE tenant_id=$1`,
      [tenant_id]
    );

    return res.json({
      success: true,
      tenant_id,
      runtime_overrides: rows.map(r => ({ key: r.key, value: r.value_num })),
      applied: {
        inventory_band,
        min_edge_bps,
        advisory_limits: advisory
      }
    });
  } catch (error) {
    console.error("Error applying recommendations:", error);
    return res.status(500).json({ error: "internal_error" });
  }
}
