import type { Request, Response } from "express";
import { ALLOWED_PARAM_KEYS, type AllowedKey } from "../policy/policy";
import { q } from "../db";

export async function postSetParam(req: Request, res: Response) {
  try {
    const tenantId = (req as any).tenantId;
    if (!tenantId) return res.status(500).json({ error: "tenant_missing_in_context" });

    const { tenant_id, key, value, actor } = req.body;

    // Verify tenant_id matches authenticated tenant
    if (tenant_id !== tenantId) {
      return res.status(403).json({ error: "tenant_id_mismatch" });
    }

    // Validate key
    if (!ALLOWED_PARAM_KEYS.includes(key as AllowedKey)) {
      return res.status(400).json({
        error: "invalid_key",
        allowed_keys: ALLOWED_PARAM_KEYS
      });
    }

    // Validate value
    if (typeof value !== "number" || value < 0) {
      return res.status(400).json({ error: "value_must_be_non_negative_number" });
    }

    // Policy-based limits (simplified - in production, check against policy rules)
    if (key === "max_slippage_bps" && value > 10) {
      return res.status(400).json({
        error: "policy_violation",
        reason: "max_slippage_bps cannot exceed 10"
      });
    }

    // Upsert KV runtime override
    await q(
      `INSERT INTO kv_runtime (tenant_id, key, value_num, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id, key)
       DO UPDATE SET value_num = $3, updated_at = NOW()`,
      [tenant_id, key, value]
    );

    // Log to governance_log
    await q(
      `INSERT INTO governance_log (tenant_id, actor, action, details)
       VALUES ($1, $2, $3, $4)`,
      [tenant_id, actor || "system", "SET_PARAM", JSON.stringify({ key, value })]
    );

    return res.json({
      success: true,
      tenant_id,
      key,
      value,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error setting param:", error);
    return res.status(500).json({ error: "internal_error" });
  }
}
