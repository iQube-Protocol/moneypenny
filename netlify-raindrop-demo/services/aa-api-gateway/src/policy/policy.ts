import yaml from "js-yaml";
import { q } from "../db";

export const ALLOWED_PARAM_KEYS = ["min_edge_bps", "max_slippage_bps", "gas_ceiling", "inventory_band"] as const;
export type AllowedKey = typeof ALLOWED_PARAM_KEYS[number];

type RiskCfg = {
  max_slippage_bps: number;
  min_edge_bps: number;
  gas_ceiling_usd: Record<string, number>;
  notional_ceiling_usd: { canary: number; prod: number };
  daily_loss_limit_bps: number;
  halt_on_peg_deviation_bps: number;
  venues_allowed: Record<string, string[]>;
  require_human_confirm: any[];
};

export type Policy = { risk: RiskCfg };

let cache: Policy | null = null;

export function loadPolicy() {
  if (cache) return cache;
  const raw = process.env.RISK_POLICY_YAML;
  if (!raw) throw new Error("RISK_POLICY_YAML missing");
  cache = yaml.load(raw) as Policy;
  return cache;
}

export function isVenueAllowed(chain: string, venue: string, p: Policy) {
  return (p.risk.venues_allowed[chain] || []).includes(venue);
}

export function gasCeiling(chain: string, p: Policy) {
  return p.risk.gas_ceiling_usd[chain] ?? 0;
}

export async function getRuntimeOverride(tenantId: string, key: AllowedKey) {
  const { rows } = await q<{ value_num: number }>(
    "SELECT value_num FROM kv_runtime WHERE tenant_id=$1 AND key=$2",
    [tenantId, key]
  );
  return rows[0]?.value_num ?? null;
}
