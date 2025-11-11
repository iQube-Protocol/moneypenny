import { loadPolicy } from "./policy";
import { q } from "../db";

type KVRow = { key: string; value_num: number };

export async function getEffectiveConfig(tenantId: string) {
  const base = loadPolicy();
  const { rows } = await q<KVRow>("SELECT key,value_num FROM kv_runtime WHERE tenant_id=$1", [tenantId]);

  const out: any = {
    risk: {
      max_slippage_bps: base.risk.max_slippage_bps,
      min_edge_bps: base.risk.min_edge_bps,
      gas_ceiling_usd: { ...base.risk.gas_ceiling_usd },
      notional_ceiling_usd: { ...base.risk.notional_ceiling_usd },
      halt_on_peg_deviation_bps: base.risk.halt_on_peg_deviation_bps
    }
  };

  let inventory_band: number | null = null;

  for (const r of rows) {
    if (r.key === "min_edge_bps") out.risk.min_edge_bps = r.value_num;
    else if (r.key === "max_slippage_bps") out.risk.max_slippage_bps = r.value_num;
    else if (r.key === "gas_ceiling")
      Object.keys(out.risk.gas_ceiling_usd).forEach((k) => (out.risk.gas_ceiling_usd[k] = r.value_num));
    else if (r.key === "inventory_band") inventory_band = r.value_num;
  }

  if (inventory_band !== null) out.inventory_band = inventory_band;

  return out;
}
