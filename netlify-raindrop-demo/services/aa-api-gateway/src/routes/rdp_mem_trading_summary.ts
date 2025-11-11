/**
 * GET /rdp/mem/trading/summary
 *
 * Returns 24h trading session summary for a persona
 */

import { Request, Response } from 'express';

// Mock trading data (replace with real DB queries in production)
const mockTradingSummaries = new Map<string, any>();

function getSummaryKey(tenant_id: string, persona_id: string): string {
  return `${tenant_id}:${persona_id}`;
}

export async function rdpMemTradingSummary(req: Request, res: Response) {
  try {
    const { tenant_id, persona_id } = req.query;

    if (!tenant_id || !persona_id) {
      return res.status(400).json({ error: 'tenant_id and persona_id required' });
    }

    const key = getSummaryKey(tenant_id as string, persona_id as string);

    // Return mock data or real data from your DB
    const summary = mockTradingSummaries.get(key) || {
      capture_bps_24h: 2.1,
      fills_24h: 47,
      chains: ['ethereum', 'arbitrum', 'base'],
      qc_earned_24h: 0.85,
      avg_edge_bps: 1.8,
      last_updated: new Date().toISOString(),
    };

    return res.json(summary);
  } catch (error: any) {
    console.error('rdp/mem/trading/summary error:', error);
    return res.status(500).json({ error: 'Failed to get summary', details: error.message });
  }
}

// Helper to update summary (called by trading engine)
export function updateTradingSummary(
  tenant_id: string,
  persona_id: string,
  data: { capture_bps_24h?: number; fills_24h?: number; chains?: string[] }
) {
  const key = getSummaryKey(tenant_id, persona_id);
  const existing = mockTradingSummaries.get(key) || {};

  mockTradingSummaries.set(key, {
    ...existing,
    ...data,
    last_updated: new Date().toISOString(),
  });
}
