-- MoneyPenny Trading Console Database Schema

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS intents (
  intent_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user','agent')),
  actor_name TEXT NOT NULL CHECK (actor_name = 'MoneyPenny'),
  kind TEXT NOT NULL CHECK (kind IN ('REBALANCE','PLACE_ORDER','CANCEL','SET_PARAM','QUERY')),
  chain TEXT,
  venue TEXT,
  symbol TEXT,
  side TEXT CHECK (side IN ('BUY','SELL')),
  size_notional NUMERIC,
  size_currency TEXT,
  max_slippage_bps NUMERIC,
  min_edge_bps NUMERIC,
  deadline_s INTEGER,
  lp_lower NUMERIC,
  lp_upper NUMERIC,
  reason TEXT,
  risk_profile TEXT NOT NULL CHECK (risk_profile IN ('CANARY','PROD')),
  requires_human_confirm BOOLEAN NOT NULL,
  kill_switch_ok BOOLEAN NOT NULL DEFAULT TRUE,
  correlation_id TEXT,
  source TEXT NOT NULL DEFAULT 'MoneyPenny'
);

CREATE INDEX IF NOT EXISTS intents_tenant_created_idx ON intents(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS policy_receipts (
  id BIGSERIAL PRIMARY KEY,
  intent_id UUID NOT NULL REFERENCES intents(intent_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision TEXT NOT NULL CHECK (decision IN ('POLICY_OK','REJECTED')),
  reason TEXT,
  fees_bps NUMERIC,
  gas_bps NUMERIC,
  computed_floor NUMERIC
);

CREATE TABLE IF NOT EXISTS intent_events (
  id BIGSERIAL PRIMARY KEY,
  intent_id UUID NOT NULL REFERENCES intents(intent_id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('ACCEPTED','REJECTED','PARTIAL_FILL','FILLED')),
  tx_hash TEXT,
  raw JSONB
);

CREATE TABLE IF NOT EXISTS fills (
  id BIGSERIAL PRIMARY KEY,
  intent_id UUID NOT NULL REFERENCES intents(intent_id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  chain TEXT NOT NULL,
  venue TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
  qty_qct NUMERIC NOT NULL,
  price_usdc NUMERIC NOT NULL,
  fee_usdc NUMERIC NOT NULL DEFAULT 0,
  gas_usd NUMERIC NOT NULL DEFAULT 0,
  tx_hash TEXT
);

CREATE TABLE IF NOT EXISTS telemetry_rollups (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_gran TEXT NOT NULL CHECK (bucket_gran IN ('1h','24h')),
  capture_bps NUMERIC NOT NULL DEFAULT 0,
  turnover NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  pnl_usd NUMERIC NOT NULL DEFAULT 0,
  var_95_usd NUMERIC,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, bucket_start, bucket_gran)
);

CREATE TABLE IF NOT EXISTS kv_runtime (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  key TEXT NOT NULL,
  value_num NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS governance_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB
);

-- Chain gas snapshots (one row per observation)
CREATE TABLE IF NOT EXISTS gas_snapshots (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  chain TEXT NOT NULL,
  gas_usd NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS gas_snapshots_idx ON gas_snapshots(chain, ts DESC);

-- Seed data for development
INSERT INTO tenants (id, name) VALUES ('qripto-dev', 'Qripto Dev')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_api_keys (tenant_id, api_key, label)
VALUES ('qripto-dev', 'DEV_KEY_123', 'Development Key')
ON CONFLICT (api_key) DO NOTHING;
