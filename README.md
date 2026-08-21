# AI Governance & Decision Layer

This repository contains a prototype for an AI governance and decision layer designed around customer data, consent, privacy, policy enforcement, and next-best-action evaluation.

The project was created to reflect the design ideas described in the Segment PDF and turn them into a working local PoC. It combines:

- event ingestion and normalization
- PII detection and masking
- policy evaluation
- decision scoring and audit logging
- a simple review UI for governance workflows

## Repository structure

```text
AI_GovernanceDemo/
├── AI_Governance_Decision_Layer_Architecture.md
├── AI_Governance_Segment_OnePager.docx
├── Segment.pdf
├── prototype/
│   ├── README.md
│   ├── backend/
│   │   ├── auth.js
│   │   ├── db.js
│   │   ├── decision.js
│   │   ├── index.js
│   │   ├── modelService.js
│   │   ├── pii.js
│   │   ├── policy.js
│   │   └── package.json
│   └── frontend/
│       ├── app.js
│       ├── index.html
│       └── style.css
└── README.md
```

## What this repo is doing

The prototype models a governance pipeline for customer events before they are used in AI-driven decisioning.

Typical flow:

1. A customer event is ingested.
2. PII and sensitive fields are scanned.
3. Governance rules and consent checks are evaluated.
4. A scoring model determines propensity or next-best action.
5. A final decision is generated, such as allow, mask, deny, or review.
6. The event and audit record are stored for traceability.

This is meant to demonstrate how enterprise governance can be placed around AI decisions without turning the system into a purely technical black box.

## Main architecture artifact

Detailed design notes are available in:

- [AI_Governance_Decision_Layer_Architecture.md](AI_Governance_Decision_Layer_Architecture.md)

That document covers:

- architecture principles
- control-plane and decision flow
- component responsibilities
- policy and governance model
- rollout recommendations
- production upgrade path

## Prototype quick start

From the project root:

```bash
cd prototype/backend
npm install
npm start
```

Then open:

```text
http://localhost:3000/
```

For the exact startup instructions and optional setup details, see [prototype/README.md](prototype/README.md).

## Optional environment configuration

### Authentication

```bash
export API_TOKENS='{"analyst":"analyst-token","decision_engine":"decision-token","governance":"governance-token","auditor":"auditor-token"}'
```

### PostgreSQL

```bash
createdb ai_gov
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_gov
```

### OPA policy engine

```bash
docker run -d -p 8181:8181 -v "$PWD/prototype/opa:/policies" openpolicyagent/opa:latest run --server --config-file /policies/config.yaml
export OPA_URL=http://localhost:8181
```

### Model service

```bash
export MODEL_SERVICE_URL=http://localhost:8001
```

## Prototype capabilities

The current prototype includes:

- Express backend with governance endpoints
- PII detection for common sensitive fields
- policy simulation using OPA-aware logic with local fallback
- Postgres-ready persistence with file fallback for local use
- role-based access for analyst, governance, auditor, and decision roles
- audit-log retrieval and event listing
- static frontend for reviewing governance decisions

## Production upgrade path

This prototype is intentionally lightweight and should be treated as a PoC. The recommended production evolution is:

1. persistent database and event history
2. OPA policy-as-code integration
3. stronger identities and RBAC
4. enterprise PII detection and masking pipelines
5. model registry and feature governance
6. full observability and lineage tracking
7. deployment behind secure API gateways and CI/CD controls

## Notes

This repository is best understood as a design-and-prototype effort for AI governance in a customer data platform context. It demonstrates the decision layer and policy controls around AI-assisted actions without asserting that the prototype is production-ready.
