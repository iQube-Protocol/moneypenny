type Entry<V> = { v: V; at: number };

export class LRU<K, V> {
  constructor(private o: { max: number; ttlMs: number }) {}
  private m = new Map<K, Entry<V>>();

  get(k: K) {
    const e = this.m.get(k);
    if (!e) return;
    if (Date.now() - e.at > this.o.ttlMs) {
      this.m.delete(k);
      return;
    }
    this.m.delete(k);
    this.m.set(k, e);
    return e.v;
  }

  set(k: K, v: V) {
    if (this.m.has(k)) this.m.delete(k);
    this.m.set(k, { v, at: Date.now() });
    if (this.m.size > this.o.max) {
      const oldest = this.m.keys().next().value;
      this.m.delete(oldest);
    }
  }

  wrap = async (k: K, fn: () => Promise<V>) => {
    const v = this.get(k);
    if (v !== undefined) return v;
    const out = await fn();
    this.set(k, out);
    return out;
  };
}
