# MoneyPenny Trading Console - API Gateway

MoneyPenny is the QriptoCENT payments & fees concierge. This API gateway provides read-only quotes, intent validation, policy enforcement, and webhook ingestion for the QriptoCENT micro-slippage trading system.

## Overview

- **No custody**: No private keys, no exchange write access
- **Policy firewall**: All intents validated against risk policy before acceptance
- **Typed intents**: Strict schema validation using Zod
- **Audit trail**: Complete SQL-based audit log + telemetry rollups
- **HMAC-secured webhooks**: Replay-safe webhook ingestion from Aigent Z

## Architecture

```
MoneyPenny (UI) → aa-api-gateway → Aigent Z (orchestrator) → Executors
                        ↓
                  Policy Firewall
                        ↓
                  PostgreSQL Audit
```

## Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL database
- API keys for external providers (DexScreener, optional RPC providers)

### Installation

```bash
cd services/aa-api-gateway
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

### Database Setup

```bash
npm run db:migrate
```

This will:
- Create all required tables
- Seed development tenant (`qripto-dev`)
- Create development API key (`DEV_KEY_123`)

### Development

```bash
npm run dev
```

Server starts on port 8787 (configurable via `PORT` env var).

### Production

```bash
npm run build
npm start
```

## API Endpoints

All endpoints (except `/health` and webhooks) require `X-Api-Key` header.

### GET /health

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "ts": "2025-01-08T12:00:00.000Z"
}
```

### GET /config

Get effective configuration (base policy + tenant overrides).

**Headers:**
- `X-Api-Key: YOUR_API_KEY`

**Response:**
```json
{
  "tenant_id": "qripto-dev",
  "effective": {
    "risk": {
      "max_slippage_bps": 2,
      "min_edge_bps": 1,
      "gas_ceiling_usd": { "ethereum": 800, ... },
      "notional_ceiling_usd": { "canary": 5000, "prod": 75000 },
      "halt_on_peg_deviation_bps": 80
    }
  }
}
```

### GET /quotes

Get aggregated quotes from multiple providers with edge calculations.

**Headers:**
- `X-Api-Key: YOUR_API_KEY`

**Query Parameters:**
- `chain` (required): `ethereum`, `polygon`, `arbitrum`, `optimism`, `base`, `solana`, `bitcoin`
- `venues` (optional): Comma-separated venue filter
- `size_usd` (optional): Intended notional size in USD (default: 1000)

**Example:**
```bash
curl "http://localhost:8787/quotes?chain=ethereum&size_usd=5000" \
  -H "X-Api-Key: DEV_KEY_123"
```

**Response:**
```json
{
  "chain": "ethereum",
  "pair": "QCT/USDC",
  "size_usd": 5000,
  "quotes": [
    {
      "venue": "uniswap",
      "chain": "ethereum",
      "pair": "QCT/USDC",
      "mid": 0.01,
      "bid": 0.009999,
      "ask": 0.010001,
      "fee_bps": 1.0,
      "est_gas_usd": 2.5,
      "total_cost_bps": 1.5,
      "floor_bps": 2.5,
      "verified": false,
      "ts": "2025-01-08T12:00:00.000Z"
    }
  ],
  "ts": "2025-01-08T12:00:00.000Z"
}
```

### POST /propose_intent

Submit a typed intent for validation and execution.

**Headers:**
- `X-Api-Key: YOUR_API_KEY`
- `Content-Type: application/json`

**Body:**
```json
{
  "intent_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "qripto-dev",
  "created_at": "2025-01-08T12:00:00.000Z",
  "actor": {
    "type": "user",
    "name": "MoneyPenny"
  },
  "kind": "PLACE_ORDER",
  "details": {
    "chain": "ethereum",
    "venue": "univ3",
    "symbol": "QCT/USDC",
    "side": "BUY",
    "size": {
      "notional": 1000,
      "currency": "USDc"
    },
    "limits": {
      "max_slippage_bps": 2,
      "min_edge_bps": 1.5,
      "deadline_s": 60
    },
    "reason": "Rebalance inventory"
  },
  "policy": {
    "risk_profile": "CANARY",
    "requires_human_confirm": false,
    "kill_switch_ok": true
  },
  "meta": {
    "source": "MoneyPenny"
  }
}
```

**Response (202):**
```json
{
  "intent_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted",
  "requires_human_confirm": false
}
```

**Error Response (400):**
```json
{
  "error": "policy_violation",
  "reason": "notional_exceeds_ceiling"
}
```

### POST /set_param

Adjust safe runtime parameters (per-tenant overrides).

**Headers:**
- `X-Api-Key: YOUR_API_KEY`
- `Content-Type: application/json`

**Body:**
```json
{
  "tenant_id": "qripto-dev",
  "key": "min_edge_bps",
  "value": 1.5,
  "actor": "admin@qripto.com"
}
```

**Allowed Keys:**
- `min_edge_bps`
- `max_slippage_bps`
- `gas_ceiling`
- `inventory_band`

**Response:**
```json
{
  "success": true,
  "tenant_id": "qripto-dev",
  "key": "min_edge_bps",
  "value": 1.5,
  "updated_at": "2025-01-08T12:00:00.000Z"
}
```

### GET /pnl

P&L metrics (stub - coming soon).

**Headers:**
- `X-Api-Key: YOUR_API_KEY`

**Query Parameters:**
- `window` (required): `1h`, `24h`, `7d`, `30d`

### GET /inventory

Per-chain inventory bands (stub - coming soon).

**Headers:**
- `X-Api-Key: YOUR_API_KEY`

### POST /webhooks/aigentz

Webhook endpoint for Aigent Z to send intent lifecycle events.

**Security:** HMAC-SHA256 signed with `WEBHOOK_HMAC_SECRET`.

**Headers:**
- `X-Timestamp`: Unix timestamp
- `X-Signature`: HMAC signature (hex)
- `Content-Type: application/json`

**Body:**
```json
{
  "intent_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "FILLED",
  "tx_hash": "0x123...",
  "fill": {
    "chain": "ethereum",
    "venue": "univ3",
    "side": "BUY",
    "qty_qct": 100000,
    "price_usdc": 0.01,
    "fee_usdc": 1.0,
    "gas_usd": 2.5
  }
}
```

**HMAC Calculation:**
```javascript
const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000);
const payload = Buffer.concat([
  Buffer.from(String(timestamp)),
  Buffer.from('.'),
  Buffer.from(JSON.stringify(body))
]);
const signature = crypto
  .createHmac('sha256', WEBHOOK_HMAC_SECRET)
  .update(payload)
  .digest('hex');
```

## Policy Configuration

Risk policy is configured via `RISK_POLICY_YAML` environment variable. See `.env.example` for full schema.

Key policy parameters:
- `max_slippage_bps`: Maximum allowed slippage (default: 2 bps)
- `min_edge_bps`: Minimum required edge (default: 1 bps)
- `gas_ceiling_usd`: Per-chain gas limits
- `notional_ceiling_usd`: Size limits by risk profile (canary/prod)
- `venues_allowed`: Whitelisted venues per chain
- `require_human_confirm`: Conditions requiring manual approval

## Database Schema

See `../../db/schema.sql` for complete schema.

Key tables:
- `tenants`: Multi-tenant support
- `tenant_api_keys`: API key management
- `intents`: All submitted intents
- `policy_receipts`: Policy validation results
- `intent_events`: Lifecycle events from Aigent Z
- `fills`: Execution fills
- `telemetry_rollups`: Aggregated metrics
- `kv_runtime`: Per-tenant parameter overrides
- `governance_log`: Parameter change audit trail

## Development

### Project Structure

```
services/aa-api-gateway/
├── src/
│   ├── index.ts              # Express app entry point
│   ├── db.ts                 # Database connection pool
│   ├── middleware/
│   │   ├── auth.ts           # API key authentication
│   │   └── hmac.ts           # HMAC webhook verification
│   ├── policy/
│   │   ├── policy.ts         # Base policy loader
│   │   └── effective.ts      # Effective config (base + overrides)
│   ├── schemas/
│   │   └── intent.ts         # Zod intent schema
│   ├── routes/
│   │   ├── config.ts         # GET /config
│   │   ├── quotes.ts         # GET /quotes
│   │   ├── propose_intent.ts # POST /propose_intent
│   │   ├── set_param.ts      # POST /set_param
│   │   └── webhooks_aigentz.ts # POST /webhooks/aigentz
│   ├── providers/
│   │   ├── types.ts          # Provider interfaces
│   │   ├── index.ts          # Provider registry
│   │   ├── dexscreener.ts    # DexScreener adapter
│   │   ├── coingecko.ts      # CoinGecko adapter
│   │   └── evm/              # EVM RPC helpers
│   └── shared/
│       └── lru.ts            # LRU cache utility
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Adding New Providers

1. Implement `QuoteProvider` interface in `src/providers/types.ts`
2. Create provider file in `src/providers/`
3. Register in `src/providers/index.ts`

### Testing

```bash
# Get quotes
curl "http://localhost:8787/quotes?chain=ethereum&size_usd=1000" \
  -H "X-Api-Key: DEV_KEY_123"

# Submit intent
curl -X POST "http://localhost:8787/propose_intent" \
  -H "X-Api-Key: DEV_KEY_123" \
  -H "Content-Type: application/json" \
  -d @intent.json

# Check config
curl "http://localhost:8787/config" \
  -H "X-Api-Key: DEV_KEY_123"
```

## MoneyPenny System Prompt

You are **MoneyPenny**, the QriptoCENT payments & fees concierge.

You NEVER execute trades. You ONLY:
1. Call read-only tools to gather quotes/P&L/inventory
2. Draft **typed Intents** strictly matching the Intent schema
3. Submit them to `/propose_intent`

Peg is **$0.01**. Refuse free-text orders; always produce JSON with chain, venue, size, limits, deadline, and a short reason.

Enforce `min_edge_bps ≥ fees+gas+0.5`.

For size > $25k, cross-chain rebalances, or parameter changes, set `requires_human_confirm: true`.

Output only JSON or tool calls.

## License

See main project LICENSE.
