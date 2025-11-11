/**
 * GET/POST /rdp/mem/prefs
 *
 * User preferences for Smart Memories (doc-level excerpts consent, etc.)
 */

import { Request, Response } from 'express';

// In-memory storage (replace with real DB in production)
const prefsStore = new Map<string, any>();

function getPrefsKey(tenant_id: string, persona_id: string): string {
  return `${tenant_id}:${persona_id}`;
}

export async function rdpMemPrefsGet(req: Request, res: Response) {
  try {
    const { tenant_id, persona_id } = req.query;

    if (!tenant_id || !persona_id) {
      return res.status(400).json({ error: 'tenant_id and persona_id required' });
    }

    const key = getPrefsKey(tenant_id as string, persona_id as string);
    const prefs = prefsStore.get(key) || {
      doc_level_excerpts: false,
      risk_profile: 'moderate',
    };

    return res.json(prefs);
  } catch (error: any) {
    console.error('rdp/mem/prefs GET error:', error);
    return res.status(500).json({ error: 'Failed to get prefs', details: error.message });
  }
}

export async function rdpMemPrefsSet(req: Request, res: Response) {
  try {
    const { tenant_id, persona_id, doc_level_excerpts, risk_profile } = req.body;

    if (!tenant_id || !persona_id) {
      return res.status(400).json({ error: 'tenant_id and persona_id required' });
    }

    const key = getPrefsKey(tenant_id, persona_id);
    const existing = prefsStore.get(key) || {};

    const updated = {
      ...existing,
      ...(doc_level_excerpts !== undefined && { doc_level_excerpts }),
      ...(risk_profile !== undefined && { risk_profile }),
    };

    prefsStore.set(key, updated);

    return res.json({ ok: true, prefs: updated });
  } catch (error: any) {
    console.error('rdp/mem/prefs POST error:', error);
    return res.status(500).json({ error: 'Failed to set prefs', details: error.message });
  }
}
