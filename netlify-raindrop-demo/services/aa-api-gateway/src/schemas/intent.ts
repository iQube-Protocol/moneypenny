import { z } from "zod";

export const IntentSchema = z.object({
  intent_id: z.string().uuid(),
  tenant_id: z.string(),
  created_at: z.string().datetime(),
  actor: z.object({
    type: z.enum(["user", "agent"]),
    name: z.literal("MoneyPenny")
  }),
  kind: z.enum(["REBALANCE", "PLACE_ORDER", "CANCEL", "SET_PARAM", "QUERY"]),
  details: z.object({
    chain: z.enum(["bitcoin", "ethereum", "solana", "polygon", "optimism", "arbitrum", "base"]).optional(),
    venue: z
      .enum(["univ3", "curve", "balancer", "orca", "raydium", "jupiter", "aggregator", "lp", "mint_burn", "anchor"])
      .optional(),
    symbol: z.literal("QCT/USDC").optional(),
    side: z.enum(["BUY", "SELL"]).optional(),
    size: z
      .object({
        notional: z.number().positive(),
        currency: z.literal("USDc")
      })
      .optional(),
    limits: z
      .object({
        max_slippage_bps: z.number().min(0),
        min_edge_bps: z.number().min(0),
        deadline_s: z.number().min(5).max(120)
      })
      .optional(),
    lp_range: z
      .object({
        lower: z.number(),
        upper: z.number()
      })
      .optional(),
    reason: z.string().max(500).optional()
  }),
  policy: z.object({
    risk_profile: z.enum(["CANARY", "PROD"]),
    requires_human_confirm: z.boolean(),
    kill_switch_ok: z.boolean().default(true)
  }),
  meta: z.object({
    correlation_id: z.string().optional(),
    source: z.literal("MoneyPenny")
  })
});

export type Intent = z.infer<typeof IntentSchema>;
