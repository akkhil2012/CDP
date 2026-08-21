AI Governance & Decision Layer — Prototype

Quickstart

1. Install dependencies and run the backend:

```bash
cd prototype/backend
npm install
node index.js
```

2. Open the UI in your browser:

- http://localhost:3000/

What this prototype includes
- Backend (Express): endpoints for /ingest, /pii/analyze, /decide, /policy/simulate, /audit/:id
- Postgres-ready store with automatic fallback to file-backed storage for local prototype runs
- OPA-aware policy evaluation with JS fallback when OPA is not running
- Stronger PII analysis for PAN, email, phone, card number, Aadhaar/SSN, and income
- Model wrapper that attempts a real model service via MODEL_SERVICE_URL and falls back to a local heuristic
- Static frontend to submit events, view decisions, and review flagged items

Local PostgreSQL setup (optional)

```bash
createdb ai_gov
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_gov
```

Authentication setup (local dev)

```bash
export API_TOKENS='{"analyst":"analyst-token","decision_engine":"decision-token","governance":"governance-token","auditor":"auditor-token"}'
```

Then include the token in the Authorization header:

```bash
curl -H "Authorization: Bearer analyst-token" http://localhost:3000/audit
```

OPA setup (optional)

```bash
docker run -d -p 8181:8181 -v "$PWD/prototype/opa:/policies" openpolicyagent/opa:latest run --server --config-file /policies/config.yaml
export OPA_URL=http://localhost:8181
```

Model service setup (optional)

```bash
export MODEL_SERVICE_URL=http://localhost:8001
```

Your model service should accept POST requests on `/predict` with JSON payloads like:

```json
{
  "event": { "ltv": 500000, "premium_card_propensity": 0.87 },
  "context": { "destination": "google_ads" }
}
```

and respond with:

```json
{
  "score": 0.87,
  "model_id": "propensity_model_v2"
}
```

Notes
- This is a minimal proof-of-concept. Production readiness still requires full auth integration, enterprise model registry, and stronger observability.
