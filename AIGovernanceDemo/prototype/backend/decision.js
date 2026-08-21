const { v4: uuidv4 } = require('uuid');
const policy = require('./policy');
const { getScore } = require('./modelService');

function maskIncome(event) {
  if (!event) return event;
  if (event.income) event.income = 'MASKED_INCOME';
  if (event.properties && event.properties.income) event.properties.income = 'MASKED_INCOME';
  return event;
}

function detectPII(event) {
  // naive PII detection for prototype
  const flags = [];
  if (!event) return flags;
  const payload = { ...event, ...event.properties };
  for (const k of Object.keys(payload)) {
    const v = payload[k];
    if (typeof v === 'string' && /[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(v)) {
      flags.push({ field: k, type: 'PAN', value: 'REDACTED' });
    }
    if (k.toLowerCase().includes('email') && v) {
      flags.push({ field: k, type: 'EMAIL' });
    }
  }
  return flags;
}

async function decide(input) {
  // input: { event, profile_id, context }
  const audit_id = uuidv4();
  const policies = policy.evaluateAll(input);

  // apply modifications
  let modifiedEvent = JSON.parse(JSON.stringify(input.event || {}));
  for (const p of policies) {
    if (p.result === 'modify' && p.action === 'mask_income') {
      modifiedEvent = maskIncome(modifiedEvent);
    }
  }

  // check denies
  const denies = policies.filter(p => p.result === 'deny');

  const modelResult = await getScore(modifiedEvent, input.context || {});
  const score = modelResult.score;
  const pii = detectPII(modifiedEvent);

  let decision = { action: 'allow', reason: 'ok' };
  if (denies.length > 0) {
    decision = { action: 'deny', reason: denies.map(d => d.reason || d.policy_id).join(',') };
  } else if (pii.length > 0) {
    decision = { action: 'modify', reason: 'pii_detected', pii }; 
  } else if (score < 0.4) {
    decision = { action: 'review', reason: 'low_score', score };
  }

  return {
    audit: {
      audit_id,
      timestamp: new Date().toISOString(),
      input_snapshot: input.event,
      modified_snapshot: modifiedEvent,
      model: { id: modelResult.model_id, version: 'v0.1', provider: modelResult.provider },
      model_outputs: { score },
      policies_applied: policies,
      decision,
      pii
    },
    decision
  };
}

module.exports = { decide };
