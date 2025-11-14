type SubscribeHandle = { close: () => void };

export class AaApiClient {
  private aigentzBase: string;
  private gatewayBase: string;
  private apiKey?: string;
  private authToken?: string;

  constructor(opts?: { aigentzBase?: string; gatewayBase?: string; apiKey?: string; authToken?: string }) {
    this.aigentzBase = opts?.aigentzBase || (import.meta as any).env.PUBLIC_AIGENT_Z_API || '';
    this.gatewayBase = opts?.gatewayBase || (import.meta as any).env.PUBLIC_MONEYPENNY_BASE || '';
    this.apiKey = opts?.apiKey;
    this.authToken = opts?.authToken;
  }

  setAuthToken(token: string) { this.authToken = token; }
  setApiKey(key: string) { this.apiKey = key; }

  async authChallenge(did: string) {
    const r = await fetch(`${this.aigentzBase}/aa/v1/auth/challenge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ did })
    });
    if (!r.ok) throw new Error(`challenge failed: ${r.status}`);
    return r.json();
  }

  async authVerify(jws: string) {
    const r = await fetch(`${this.aigentzBase}/aa/v1/auth/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jws })
    });
    if (!r.ok) throw new Error(`verify failed: ${r.status}`);
    return r.json();
  }

  subscribeFeed(onMessage: (msg: any) => void, onError?: (e: any) => void): SubscribeHandle {
    let aborted = false;
    const ctrl = new AbortController();
    const run = async () => {
      try {
        const r = await fetch(`${this.aigentzBase}/aa/v1/updates`, {
          method: 'GET',
          headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {},
          signal: ctrl.signal,
        });
        if (!r.ok || !r.body) throw new Error(`sse ${r.status}`);
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try { onMessage(JSON.parse(line.slice(6))); } catch {}
            }
          }
        }
      } catch (e) {
        if (onError) onError(e);
      }
    };
    run();
    return { close: () => { aborted = true; ctrl.abort(); } };
  }

  async getQuotes(params: { chain: string; size_usd: number }) {
    const url = new URL(`${this.gatewayBase}/quotes`);
    url.searchParams.set('chain', params.chain);
    url.searchParams.set('size_usd', String(params.size_usd));
    const headers: Record<string, string> = {};
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) throw new Error(`quotes failed: ${r.status}`);
    return r.json();
  }

  async proposeIntent(payload: any) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) headers['X-Api-Key'] = this.apiKey;
    const r = await fetch(`${this.gatewayBase}/propose_intent`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`propose_intent failed: ${r.status}`);
    return r.json();
  }
}
