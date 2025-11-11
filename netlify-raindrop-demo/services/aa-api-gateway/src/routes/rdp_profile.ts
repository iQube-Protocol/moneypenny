/**
 * RDP Profile endpoints (stub implementation)
 */

import { Request, Response } from 'express';

// Mock storage for aggregates
const aggregates = new Map<string, any>();

function getAggregateKey(tenant_id: string, persona_id: string): string {
  return `${tenant_id}:${persona_id}`;
}

export async function rdpProfileGetAggregates(req: Request, res: Response) {
  try {
    const { tenant_id, persona_id } = req.query;

    if (!tenant_id || !persona_id) {
      return res.status(400).json({ error: 'tenant_id and persona_id required' });
    }

    const key = getAggregateKey(tenant_id as string, persona_id as string);
    const agg = aggregates.get(key);

    if (!agg) {
      return res.status(404).json({ error: 'No aggregates found' });
    }

    return res.json(agg);
  } catch (error: any) {
    console.error('rdp/profile/aggregates GET error:', error);
    return res.status(500).json({ error: 'Failed to get aggregates', details: error.message });
  }
}

export async function rdpProfileComputeAggregate(req: Request, res: Response) {
  try {
    const { tenant_id, persona_id, months } = req.body;

    if (!tenant_id || !persona_id || !months) {
      return res.status(400).json({ error: 'tenant_id, persona_id, and months required' });
    }

    // Mock aggregate computation
    const aggregate = {
      avg_surplus_daily: 150.0,
      surplus_volatility_daily: 45.0,
      closing_balance_last: 5000.0,
      avg_daily_expenses: 80.0,
      cash_buffer_days: 62,
      proposed_overrides: {
        inventory_band: 1.81,
        min_edge_bps_baseline: 1.0,
        max_notional_usd_day: 52.5,
        daily_loss_limit_bps: 15
      }
    };

    const key = getAggregateKey(tenant_id, persona_id);
    const data = {
      aggregate,
      monthCount: months.length,
      computed_at: new Date().toISOString()
    };

    aggregates.set(key, data);

    return res.json(data);
  } catch (error: any) {
    console.error('rdp/profile/aggregate POST error:', error);
    return res.status(500).json({ error: 'Failed to compute aggregate', details: error.message });
  }
}

export async function rdpProfileApplyToConsole(req: Request, res: Response) {
  try {
    const { tenant_id, persona_id, inventory_band, min_edge_bps } = req.body;

    if (!tenant_id || !persona_id) {
      return res.status(400).json({ error: 'tenant_id and persona_id required' });
    }

    // Apply inventory_band via set_param
    if (inventory_band !== undefined) {
      // This would call the /set_param endpoint internally
      console.log(`Applying inventory_band=${inventory_band} for ${tenant_id}:${persona_id}`);
    }

    if (min_edge_bps !== undefined) {
      console.log(`Applying min_edge_bps=${min_edge_bps} for ${tenant_id}:${persona_id}`);
    }

    return res.json({ ok: true, applied: { inventory_band, min_edge_bps } });
  } catch (error: any) {
    console.error('rdp/profile/apply error:', error);
    return res.status(500).json({ error: 'Failed to apply to console', details: error.message });
  }
}
