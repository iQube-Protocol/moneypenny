export const RDP = {
  buckets: {
    // Create or fetch the persona's bucket (idempotent)
    async init(tenant_id: string, persona_id: string) {
      const base = import.meta.env.PUBLIC_SMART_BUCKETS_BASE;
      const r = await fetch(`${base}/init`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id, persona_id }),
      });
      if (!r.ok) throw new Error("bucket init failed");
      return r.json() as Promise<{ bucket_id: string }>;
    },
    // One-time pre-signed upload token (accepts pdf/csv)
    async uploadToken(bucket_id: string) {
      const base = import.meta.env.PUBLIC_SMART_BUCKETS_BASE;
      const r = await fetch(`${base}/upload-token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bucket_id, mime: ["application/pdf","text/csv"] }),
      });
      if (!r.ok) throw new Error("upload token failed");
      return r.json() as Promise<{ upload_url: string; headers?: Record<string,string> }>;
    },
    async putFile(upload_url: string, headers: Record<string,string>|undefined, file: File) {
      const r = await fetch(upload_url, { method: "PUT", headers: headers || {}, body: file });
      if (!r.ok) throw new Error("upload failed");
      return true;
    },
    async list(bucket_id: string) {
      const base = import.meta.env.PUBLIC_SMART_BUCKETS_BASE;
      const r = await fetch(`${base}/list?bucket_id=${encodeURIComponent(bucket_id)}`);
      if (!r.ok) throw new Error("list failed");
      return r.json() as Promise<Array<{ file_id: string; name: string; month?: string; size: number; sha256?: string; created_at: string }>>;
    },
    async del(bucket_id: string, file_id: string) {
      const base = import.meta.env.PUBLIC_SMART_BUCKETS_BASE;
      const r = await fetch(`${base}/delete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bucket_id, file_id }),
      });
      if (!r.ok) throw new Error("delete failed");
      return r.json() as Promise<{ ok: boolean }>;
    },
  },
  mem: {
    async append(shard: string, entry: any) {
      const base = import.meta.env.PUBLIC_SMART_MEM_BASE;
      const r = await fetch(`${base}/append`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shard, entry }),
      });
      if (!r.ok) throw new Error("mem append failed");
      return r.json();
    },
    async search(shards: string[], q: string, k = 8, filters?: any) {
      const base = import.meta.env.PUBLIC_SMART_MEM_BASE;
      const r = await fetch(`${base}/search`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shards, q, k, filters }),
      });
      if (!r.ok) throw new Error("mem search failed");
      return r.json() as Promise<Array<{ memo_id: string; score: number; snippet: string; data?: any }>>;
    },
    async prefsGet(tenant_id: string, persona_id: string) {
      const base = import.meta.env.PUBLIC_SMART_MEM_BASE;
      const r = await fetch(`${base}/prefs?tenant_id=${tenant_id}&persona_id=${persona_id}`);
      if (!r.ok) throw new Error("prefs get failed");
      return r.json() as Promise<{ doc_level_excerpts: boolean; risk_profile?: string }>;
    },
    async prefsSet(tenant_id: string, persona_id: string, prefs: any) {
      const base = import.meta.env.PUBLIC_SMART_MEM_BASE;
      const r = await fetch(`${base}/prefs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenant_id, persona_id, ...prefs }),
      });
      if (!r.ok) throw new Error("prefs set failed");
      return r.json();
    },
  },
  // Existing profile aggregate endpoints you already exposed:
  profile: {
    async computeAggregate(monthsPayload: any) {
      const base = import.meta.env.PUBLIC_BANKING_PROFILE_BASE;
      const r = await fetch(`${base}/profile/aggregate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(monthsPayload),
      });
      if (!r.ok) throw new Error("aggregate failed");
      return r.json();
    },
    async getAggregates(tenant_id: string, persona_id: string) {
      const base = import.meta.env.PUBLIC_BANKING_PROFILE_BASE;
      const r = await fetch(`${base}/profile/aggregates?tenant_id=${tenant_id}&persona_id=${persona_id}`);
      if (!r.ok) throw new Error("get aggregates failed");
      return r.json();
    },
    async applyToConsole(payload: any) {
      const base = import.meta.env.PUBLIC_MONEYPENNY_BASE;
      const r = await fetch(`${base}/recommendations/apply`, {
        method: "POST",
        headers: { "content-type": "application/json", "X-Api-Key":"DEV_KEY_123" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("apply failed");
      return r.json();
    },
  },
  trading: {
    async sessionSummary(tenant_id: string, persona_id: string) {
      const base = import.meta.env.PUBLIC_MONEYPENNY_BASE;
      const r = await fetch(`${base}/mem/trading/summary?tenant_id=${tenant_id}&persona_id=${persona_id}`);
      if (!r.ok) throw new Error("summary failed");
      return r.json() as Promise<{ capture_bps_24h: number; fills_24h: number; chains: string[] }>;
    }
  },
};
