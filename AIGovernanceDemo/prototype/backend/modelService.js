const http = require('http');

function fallbackScore(event) {
  let score = 0.1;
  const payload = event || {};
  const props = payload.properties || {};
  const ltv = payload.ltv ?? props.ltv ?? 0;
  const premium = payload.premium_card_propensity ?? props.premium_card_propensity ?? 0;
  const active = payload.is_active ?? props.is_active ?? false;
  const channel = payload.preferred_channel ?? props.preferred_channel ?? '';

  score += ltv > 0 ? 0.4 : 0;
  score += premium > 0 ? 0.3 : 0;
  score += active ? 0.15 : 0;
  score += channel === 'push' ? 0.1 : 0;
  return Math.min(1, score);
}

function requestModel(url, payload) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error || `Model service error ${res.statusCode}`));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function getScore(event, context = {}) {
  const baseUrl = process.env.MODEL_SERVICE_URL || '';
  if (baseUrl) {
    try {
      const result = await requestModel(new URL('/predict', baseUrl), { event, context });
      return {
        score: Number(result.score ?? fallbackScore(event)),
        model_id: result.model_id || 'external_model',
        provider: 'external_service'
      };
    } catch (error) {
      console.warn('Model service unavailable, falling back to local heuristic.', error.message);
    }
  }

  return {
    score: fallbackScore(event),
    model_id: 'mock_propensity_v1',
    provider: 'local_fallback'
  };
}

module.exports = { getScore };
