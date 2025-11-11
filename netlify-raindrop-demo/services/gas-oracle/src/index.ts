import { q } from "./db.js";

const CHAINS = (process.env.GAS_CHAINS || "ethereum,arbitrum,base,polygon,solana")
  .split(",")
  .map((s) => s.trim());
const PERIOD_MS = Number(process.env.GAS_PERIOD_MS || 30_000);
const LOOKBACK_MIN = Number(process.env.GAS_LOOKBACK_MIN || 10);

async function estimateGasUsd(chain: string): Promise<number> {
  // Minimal heuristic; replace with on-chain calls or 3rd-party APIs.
  // Return an estimated end-to-end USD gas cost for a single Q¢ swap (buy or sell) on this chain.
  const baselines: Record<string, number> = {
    ethereum: 0.65,
    arbitrum: 0.08,
    base: 0.05,
    polygon: 0.03,
    solana: 0.002,
  };
  const jitter = (Math.random() - 0.5) * (baselines[chain] || 0.05) * 0.2;
  return Math.max(0.0005, (baselines[chain] || 0.05) + jitter);
}

async function median(nums: number[]): Promise<number> {
  const a = nums.slice().sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

async function tick() {
  for (const chain of CHAINS) {
    try {
      const gasUsd = await estimateGasUsd(chain);
      await q(`INSERT INTO gas_snapshots(chain, gas_usd) VALUES ($1,$2)`, [
        chain,
        gasUsd,
      ]);

      // compute rolling median
      const { rows } = await q(
        `SELECT gas_usd FROM gas_snapshots
         WHERE chain=$1 AND ts > now() - ($2 || ' minutes')::interval`,
        [chain, LOOKBACK_MIN]
      );
      const med = await median(rows.map((r) => Number(r.gas_usd)));
      await q(
        `INSERT INTO kv_runtime(tenant_id,key,value_num)
         VALUES ('__global__', $1, $2)
         ON CONFLICT (tenant_id,key) DO UPDATE SET value_num=EXCLUDED.value_num, updated_at=now()`,
        [`gas_usd_median_${chain}`, med || gasUsd]
      );

      console.log(`[${chain}] gas=${gasUsd.toFixed(4)} median=${(med || gasUsd).toFixed(4)}`);
    } catch (err) {
      console.error(`[${chain}] error:`, err);
    }
  }
  setTimeout(tick, PERIOD_MS + Math.floor(Math.random() * 5000));
}

console.log("gas-oracle started - chains:", CHAINS.join(", "));
tick();
