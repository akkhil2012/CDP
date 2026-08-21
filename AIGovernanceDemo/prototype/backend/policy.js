// Simple policy adapter for prototype purposes.
// If OPA is configured via OPA_URL, this module will prefer OPA policy evaluation.

const policies = [
  {
    id: 'policy_ad_marketing_consent',
    description: 'Advertising activation requires marketing_consent == true',
    evaluate: (input) => {
      const dest = input.context && input.context.destination;
      if (dest && dest.toLowerCase().includes('ads')) {
        return (input.event && input.event.marketing_consent === true) ? { result: 'allow' } : { result: 'deny', reason: 'missing_marketing_consent' };
      }
      return { result: 'allow' };
    }
  },
  {
    id: 'policy_no_pan_to_marketing',
    description: 'PAN must not be sent to marketing destinations',
    evaluate: (input) => {
      const dest = input.context && input.context.destination;
      const hasPAN = input.event && (input.event.pan || (input.event.properties && input.event.properties.pan));
      if (dest && dest.toLowerCase().includes('ads') && hasPAN) {
        return { result: 'deny', reason: 'pan_in_payload' };
      }
      return { result: 'allow' };
    }
  },
  {
    id: 'policy_mask_income_for_marketing',
    description: 'Income can be used but must be masked for marketing destinations',
    evaluate: (input) => {
      const dest = input.context && input.context.destination;
      const hasIncome = input.event && (input.event.income || (input.event.properties && input.event.properties.income));
      if (dest && dest.toLowerCase().includes('ads') && hasIncome) {
        return { result: 'modify', action: 'mask_income' };
      }
      return { result: 'allow' };
    }
  }
];

async function evaluateWithOPA(input) {
  const opaUrl = process.env.OPA_URL || 'http://localhost:8181';
  try {
    const response = await fetch(`${opaUrl}/v1/data/governance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });

    if (!response.ok) {
      throw new Error(`OPA returned ${response.status}`);
    }

    const body = await response.json();
    const result = body && body.result ? body.result : {};
    const decisions = Array.isArray(result.decisions) ? result.decisions : [];
    if (decisions.length > 0) {
      return decisions.map((d) => ({
        policy_id: d.policy_id,
        description: d.description || d.policy_id,
        ...d
      }));
    }

    return [];
  } catch (error) {
    return null;
  }
}

function evaluateLocally(input) {
  return policies.map(p => {
    try {
      const res = p.evaluate(input);
      return { policy_id: p.id, description: p.description, ...res };
    } catch (e) {
      return { policy_id: p.id, description: p.description, result: 'error', error: e.message };
    }
  });
}

async function evaluateAll(input) {
  const opaResults = await evaluateWithOPA(input);
  if (opaResults && opaResults.length > 0) {
    return opaResults;
  }
  return evaluateLocally(input);
}

module.exports = { evaluateAll, policies, evaluateLocally };
