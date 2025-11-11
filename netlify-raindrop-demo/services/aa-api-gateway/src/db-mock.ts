// Mock in-memory database for testing without PostgreSQL

interface Tenant {
  id: string;
  name: string;
  created_at: Date;
}

interface ApiKey {
  api_key: string;
  tenant_id: string;
  is_active: boolean;
}

interface Intent {
  intent_id: string;
  tenant_id: string;
  created_at: string;
  [key: string]: any;
}

interface KVRuntime {
  tenant_id: string;
  key: string;
  value_num: number;
}

interface PolicyReceipt {
  intent_id: string;
  decision: string;
  reason: string | null;
  fees_bps?: number;
  gas_bps?: number;
  computed_floor?: number;
}

interface IntentEvent {
  intent_id: string;
  status: string;
  tx_hash: string | null;
  raw: any;
}

interface Fill {
  intent_id: string;
  chain: string;
  venue: string;
  side: string;
  qty_qct: number;
  price_usdc: number;
  fee_usdc: number;
  gas_usd: number;
  tx_hash: string | null;
}

interface GovernanceLog {
  tenant_id: string;
  actor: string;
  action: string;
  details: any;
}

class MockDatabase {
  private tenants: Map<string, Tenant> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private intents: Map<string, Intent> = new Map();
  private kvRuntime: Map<string, KVRuntime> = new Map();
  private policyReceipts: PolicyReceipt[] = [];
  private intentEvents: IntentEvent[] = [];
  private fills: Fill[] = [];
  private governanceLogs: GovernanceLog[] = [];

  constructor() {
    // Seed development data
    this.tenants.set('qripto-dev', {
      id: 'qripto-dev',
      name: 'Qripto Dev',
      created_at: new Date()
    });

    this.apiKeys.set('DEV_KEY_123', {
      api_key: 'DEV_KEY_123',
      tenant_id: 'qripto-dev',
      is_active: true
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
    // Simple query parser for common operations
    const sqlLower = sql.toLowerCase().trim();

    // SELECT tenant_id FROM tenant_api_keys WHERE api_key=$1 AND is_active=true
    if (sqlLower.includes('select tenant_id from tenant_api_keys')) {
      const apiKey = params[0];
      const key = this.apiKeys.get(apiKey);
      if (key && key.is_active) {
        return { rows: [{ tenant_id: key.tenant_id }] as T[] };
      }
      return { rows: [] };
    }

    // SELECT key,value_num FROM kv_runtime WHERE tenant_id=$1
    if (sqlLower.includes('select key,value_num from kv_runtime')) {
      const tenantId = params[0];
      const results: any[] = [];
      for (const [_, kv] of this.kvRuntime) {
        if (kv.tenant_id === tenantId) {
          results.push({ key: kv.key, value_num: kv.value_num });
        }
      }
      return { rows: results as T[] };
    }

    // SELECT value_num FROM kv_runtime WHERE tenant_id=$1 AND key=$2
    if (sqlLower.includes('select value_num from kv_runtime where')) {
      const tenantId = params[0];
      const key = params[1];
      const kvKey = `${tenantId}:${key}`;
      const kv = this.kvRuntime.get(kvKey);
      if (kv) {
        return { rows: [{ value_num: kv.value_num }] as T[] };
      }
      return { rows: [] };
    }

    // INSERT INTO intents
    if (sqlLower.includes('insert into intents')) {
      const intent: any = {
        intent_id: params[0],
        tenant_id: params[1],
        created_at: params[2],
        // ... other fields
      };
      this.intents.set(params[0], intent);
      return { rows: [] };
    }

    // INSERT INTO policy_receipts
    if (sqlLower.includes('insert into policy_receipts')) {
      this.policyReceipts.push({
        intent_id: params[0],
        decision: params[1],
        reason: params[2],
        fees_bps: params[3],
        gas_bps: params[4],
        computed_floor: params[5]
      });
      return { rows: [] };
    }

    // INSERT INTO kv_runtime (with UPSERT)
    if (sqlLower.includes('insert into kv_runtime')) {
      const tenantId = params[0];
      const key = params[1];
      const value = params[2];
      const kvKey = `${tenantId}:${key}`;
      this.kvRuntime.set(kvKey, { tenant_id: tenantId, key, value_num: value });
      return { rows: [] };
    }

    // INSERT INTO governance_log
    if (sqlLower.includes('insert into governance_log')) {
      this.governanceLogs.push({
        tenant_id: params[0],
        actor: params[1],
        action: params[2],
        details: params[3]
      });
      return { rows: [] };
    }

    // INSERT INTO intent_events
    if (sqlLower.includes('insert into intent_events')) {
      this.intentEvents.push({
        intent_id: params[0],
        status: params[1],
        tx_hash: params[2],
        raw: params[3]
      });
      return { rows: [] };
    }

    // INSERT INTO fills
    if (sqlLower.includes('insert into fills')) {
      this.fills.push({
        intent_id: params[0],
        chain: params[1],
        venue: params[2],
        side: params[3],
        qty_qct: params[4],
        price_usdc: params[5],
        fee_usdc: params[6],
        gas_usd: params[7],
        tx_hash: params[8]
      });
      return { rows: [] };
    }

    // Default: return empty result
    console.log('Mock DB: Unhandled query:', sql.substring(0, 100));
    return { rows: [] };
  }
}

const mockDb = new MockDatabase();

export async function q<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  return mockDb.query<T>(sql, params || []);
}

export const pool = {
  connect: async () => ({
    query: mockDb.query.bind(mockDb),
    release: () => {}
  })
};
