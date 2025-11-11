# Banking Profile Service

Extracts suitability features from bank statements and proposes policy overrides for the MoneyPenny Trading Console.

## Features

- **Statement Ingestion**: Upload PDF/CSV bank statements
- **ADE Extraction**: Uses LandingAI ADE for structured data extraction
- **Feature Derivation**: Computes avg_daily_surplus, surplus_volatility, cash_buffer_days, max_drawdown
- **Policy Proposals**: Maps features to risk policy overrides (max_notional, daily_loss_limit, inventory_band)
- **PII Minimization**: Only features stored, not raw transaction details
- **iQube Integration**: BlakQube (raw), ProfileQube (features), DiDQube (attestations)

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run in development mode (with mock ADE)
python app.py

# Run with real ADE (requires VISION_AGENT_API_KEY)
USE_MOCK_ADE=false python app.py
```

## API Endpoints

### POST /bank/ingest
Upload statement for storage in BlakQube.

```bash
curl -F "tenant_id=qripto-dev" -F "file=@statement.pdf" \
  http://localhost:8788/bank/ingest
```

### POST /bank/extract
Extract features and propose policy overrides.

```bash
curl -F "tenant_id=qripto-dev" -F "file=@statement.pdf" \
  http://localhost:8788/bank/extract
```

Response:
```json
{
  "tenant_id": "qripto-dev",
  "raw_hash": "abc123...",
  "features": {
    "avg_daily_surplus": 125.50,
    "surplus_volatility": 45.20,
    "closing_balance": 5432.10,
    "cash_buffer_days": 43.2,
    "max_drawdown": 250.00
  },
  "proposed_overrides": {
    "max_notional_usd_day": 43.92,
    "daily_loss_limit_bps": 13.6,
    "inventory_band": 5.02,
    "min_edge_bps_baseline": 1.0
  },
  "consent": {
    "purpose": "Qc-suitability-v1",
    "scope": "feature-level",
    "retention": "12m"
  }
}
```

## Integration with MoneyPenny

The proposed overrides can be applied to MoneyPenny via `/set_param`:

```bash
curl -X POST http://localhost:8787/set_param \
  -H "X-Api-Key: DEV_KEY_123" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "qripto-dev",
    "key": "inventory_band",
    "value": 5.02,
    "actor": "BankingProfile"
  }'
```

## Mock vs Production Mode

**Mock Mode** (default):
- Generates synthetic statement data
- No external API calls required
- Perfect for development/testing

**Production Mode**:
- Requires `VISION_AGENT_API_KEY` from LandingAI
- Uses real ADE for document parsing
- Set `USE_MOCK_ADE=false`

## Privacy & Security

- **Raw statements** → BlakQube (encrypted, tenant-scoped)
- **Normalized data** → DataQube (PII-minimized)
- **Features only** → ProfileQube (aggregated metrics)
- **Attestations** → DiDQube (hash linkage + consent scope)

No raw transaction details leave the system; only derived features are used for policy recommendations.
