import { Pool } from "pg";

// Use mock database if DATABASE_URL is not set or contains placeholder
const useMock = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('USER:PASS');

if (useMock) {
  console.log('⚠️  Using MOCK in-memory database (no PostgreSQL required)');
  console.log('   Set DATABASE_URL environment variable to use real PostgreSQL\n');
}

// Mock implementation
const mockDatabase = useMock ? (() => {
  interface ApiKey {
    api_key: string;
    tenant_id: string;
    is_active: boolean;
  }

  interface KVRuntime {
    tenant_id: string;
    key: string;
    value_num: number;
  }

  const apiKeys = new Map<string, ApiKey>();
  const kvRuntime = new Map<string, KVRuntime>();
  const intents: any[] = [];
  const policyReceipts: any[] = [];
  const intentEvents: any[] = [];
  const fills: any[] = [];
  const governanceLogs: any[] = [];

  // Seed development data
  apiKeys.set('DEV_KEY_123', {
    api_key: 'DEV_KEY_123',
    tenant_id: 'qripto-dev',
    is_active: true
  });

  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[] }> {
      const sqlLower = sql.toLowerCase().trim();

      // SELECT tenant_id FROM tenant_api_keys WHERE api_key=$1 AND is_active=true
      if (sqlLower.includes('select tenant_id from tenant_api_keys')) {
        const apiKey = params[0];
        const key = apiKeys.get(apiKey);
        if (key && key.is_active) {
          return { rows: [{ tenant_id: key.tenant_id }] as T[] };
        }
        return { rows: [] };
      }

      // SELECT key,value_num FROM kv_runtime WHERE tenant_id=$1
      if (sqlLower.includes('select key,value_num from kv_runtime')) {
        const tenantId = params[0];
        const results: any[] = [];
        for (const [_, kv] of kvRuntime) {
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
        const kv = kvRuntime.get(kvKey);
        if (kv) {
          return { rows: [{ value_num: kv.value_num }] as T[] };
        }
        return { rows: [] };
      }

      // INSERT INTO intents
      if (sqlLower.includes('insert into intents')) {
        intents.push({ intent_id: params[0], tenant_id: params[1] });
        return { rows: [] };
      }

      // INSERT INTO policy_receipts
      if (sqlLower.includes('insert into policy_receipts')) {
        policyReceipts.push({ intent_id: params[0], decision: params[1] });
        return { rows: [] };
      }

      // INSERT INTO kv_runtime (with UPSERT)
      if (sqlLower.includes('insert into kv_runtime')) {
        const tenantId = params[0];
        const key = params[1];
        const value = params[2];
        const kvKey = `${tenantId}:${key}`;
        kvRuntime.set(kvKey, { tenant_id: tenantId, key, value_num: value });
        return { rows: [] };
      }

      // INSERT INTO governance_log
      if (sqlLower.includes('insert into governance_log')) {
        governanceLogs.push({ tenant_id: params[0], actor: params[1] });
        return { rows: [] };
      }

      // INSERT INTO intent_events
      if (sqlLower.includes('insert into intent_events')) {
        intentEvents.push({ intent_id: params[0], status: params[1] });
        return { rows: [] };
      }

      // INSERT INTO fills
      if (sqlLower.includes('insert into fills')) {
        fills.push({ intent_id: params[0], chain: params[1] });
        return { rows: [] };
      }

      return { rows: [] };
    }
  };
})() : null;

// Real PostgreSQL implementation
const realPool = useMock ? null : new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000
});

export const pool = realPool || { connect: async () => ({ query: mockDatabase!.query, release: () => {} }) };

export async function q<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  if (useMock && mockDatabase) {
    return mockDatabase.query<T>(sql, params || []);
  }

  const c = await realPool!.connect();
  try {
    return await c.query<T>(sql, params);
  } finally {
    c.release();
  }
}
