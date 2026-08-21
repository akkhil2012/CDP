const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const decision = require('./decision');
const policy = require('./policy');
const db = require('./db');
const { authMiddleware } = require('./auth');
const pii = require('./pii');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend
app.use('/', express.static(path.join(__dirname, '..', 'frontend')));

app.post('/ingest', authMiddleware('analyst'), async (req, res) => {
  // simple preprocess: normalize properties into top-level
  const evt = req.body;
  if (evt.properties) {
    Object.assign(evt, evt.properties);
    delete evt.properties;
  }
  // naive schema validation
  const required = ['event', 'user_id'];
  const missing = required.filter(k => !evt[k]);
  if (missing.length) return res.status(400).json({ error: 'missing', missing });

  try {
    const stored = await db.addEvent(evt);
    return res.json({ status: 'ingested', event: evt, stored });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/pii/analyze', authMiddleware('governance'), async (req, res) => {
  try {
    const findings = pii.analyze(req.body || {});
    const { sanitized, redactedFields } = pii.sanitize(req.body || {}, findings);
    return res.json({ findings, sanitized, redactedFields });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post('/decide', authMiddleware('decision_engine'), async (req, res) => {
  const input = req.body;
  try {
    const piiFindings = pii.analyze(input.event || input || {});
    const { sanitized, redactedFields } = pii.sanitize(input.event || input || {}, piiFindings);
    const enhancedInput = { ...input, event: sanitized, pii_findings: piiFindings, redacted_fields: redactedFields };
    const { audit, decision: dec } = await decision.decide(enhancedInput);
    await db.addAudit(audit);
    return res.json({ audit_id: audit.audit_id, decision: dec, pii_findings: piiFindings, redacted_fields: redactedFields });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

app.post('/policy/simulate', authMiddleware('governance'), async (req, res) => {
  const input = req.body;
  try {
    const r = policy.evaluateAll(input);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/audit/:id', authMiddleware('auditor'), async (req, res) => {
  try {
    const a = await db.getAuditById(req.params.id);
    if (!a) return res.status(404).json({ error: 'not_found' });
    return res.json(a);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.get('/audit', authMiddleware('auditor'), async (req, res) => {
  try {
    const rows = await db.listAudits();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/events', authMiddleware('analyst'), async (req, res) => {
  try {
    const rows = await db.listEvents();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Prototype backend listening on ${PORT}`));
