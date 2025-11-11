import type { Request, Response } from "express";
import { IntentSchema, Intent } from "../schemas/intent";
import { loadPolicy, isVenueAllowed, gasCeiling } from "../policy/policy";
import { q } from "../db";

async function estimateFeesBps(_i: Intent) {
  // In production, fetch from venue/pool
  return 2.0;
}

async function estimateGasUsd(i: Intent) {
  const p = loadPolicy();
  const chain = i.details?.chain || "ethereum";
  return gasCeiling(chain, p) * 0.1;
}

async function forwardToAigentZ(intent: Intent) {
  const url = process.env.AIGENTZ_INTENT_ENDPOINT;
  if (!url) return { forwarded: false, reason: "endpoint_unset" };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tenant-id": intent.tenant_id
      },
      body: JSON.stringify(intent)
    });
    return { forwarded: r.ok, status: r.status };
  } catch (e: any) {
    return { forwarded: false, reason: e?.message || "network_error" };
  }
}

function mustConfirm(i: Intent) {
  if (i.kind === "SET_PARAM" || i.kind === "REBALANCE") return true;
  const n = i.details?.size?.notional ?? 0;
  return n > 25_000 || i.policy.requires_human_confirm;
}

export async function postProposeIntent(req: Request, res: Response) {
  const parsed = IntentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "schema_invalid",
      details: parsed.error.flatten()
    });
  }

  const intent = parsed.data;
  const callerTenant = (req as any).tenantId;

  if (callerTenant && callerTenant !== intent.tenant_id) {
    return res.status(403).json({ error: "cross_tenant_intent_forbidden" });
  }

  try {
    const p = loadPolicy();

    // Venue whitelist check
    if (intent.details?.chain && intent.details?.venue) {
      if (!isVenueAllowed(intent.details.chain, intent.details.venue, p)) {
        return res.status(400).json({ error: "venue_not_allowed" });
      }
    }

    // Calculate costs
    const feesBps = await estimateFeesBps(intent);
    const gasUsd = await estimateGasUsd(intent);
    const notional = intent.details?.size?.notional ?? 0;
    const gasBps = notional > 0 ? (gasUsd / notional) * 10_000 : 0;

    const limits = intent.details?.limits;
    if (!limits) {
      return res.status(400).json({ error: "limits_required" });
    }

    // Floor check: fees + gas + safety buffer
    const floor = feesBps + gasBps + 0.5;
    if (limits.min_edge_bps < floor) {
      await q(
        `INSERT INTO policy_receipts(intent_id,decision,reason,fees_bps,gas_bps,computed_floor)
         VALUES ($1,'REJECTED',$2,$3,$4,$5)`,
        [intent.intent_id, "min_edge_bps below policy floor", feesBps, gasBps, floor]
      );
      return res.status(400).json({
        error: "edge_too_low",
        floor_bps: +floor.toFixed(4),
        fees_bps: +feesBps.toFixed(4),
        gas_bps: +gasBps.toFixed(4)
      });
    }

    // Slippage check
    if (limits.max_slippage_bps > p.risk.max_slippage_bps) {
      return res.status(400).json({
        error: "slippage_too_high",
        max: p.risk.max_slippage_bps
      });
    }

    // Notional ceiling check
    const ceiling =
      intent.policy.risk_profile === "CANARY"
        ? p.risk.notional_ceiling_usd.canary
        : p.risk.notional_ceiling_usd.prod;

    if (notional > ceiling) {
      return res.status(400).json({
        error: "notional_exceeds_ceiling",
        ceiling_usd: ceiling
      });
    }

    // Persist intent
    await q(
      `INSERT INTO intents(
        intent_id,tenant_id,created_at,actor_type,actor_name,kind,
        chain,venue,symbol,side,size_notional,size_currency,
        max_slippage_bps,min_edge_bps,deadline_s,
        lp_lower,lp_upper,reason,
        risk_profile,requires_human_confirm,kill_switch_ok,
        correlation_id,source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [
        intent.intent_id,
        intent.tenant_id,
        intent.created_at,
        intent.actor.type,
        intent.actor.name,
        intent.kind,
        intent.details?.chain ?? null,
        intent.details?.venue ?? null,
        intent.details?.symbol ?? null,
        intent.details?.side ?? null,
        intent.details?.size?.notional ?? null,
        intent.details?.size?.currency ?? null,
        limits.max_slippage_bps,
        limits.min_edge_bps,
        limits.deadline_s,
        intent.details?.lp_range?.lower ?? null,
        intent.details?.lp_range?.upper ?? null,
        intent.details?.reason ?? null,
        intent.policy.risk_profile,
        mustConfirm(intent),
        intent.policy.kill_switch_ok,
        intent.meta.correlation_id ?? null,
        intent.meta.source
      ]
    );

    // Log policy receipt
    await q(
      `INSERT INTO policy_receipts(intent_id,decision,reason,fees_bps,gas_bps,computed_floor)
       VALUES ($1,'POLICY_OK',$2,$3,$4,$5)`,
      [intent.intent_id, "limits >= floor", feesBps, gasBps, floor]
    );

    // Forward to Aigent Z
    const forward = await forwardToAigentZ(intent);

    return res.status(202).json({
      accepted: true,
      requires_human_confirm: mustConfirm(intent),
      policy_floor_bps: +floor.toFixed(4),
      forwarded: forward.forwarded,
      forward_status: forward.status ?? null
    });
  } catch (error) {
    console.error("Error proposing intent:", error);
    return res.status(500).json({ error: "internal_error" });
  }
}
