function recursiveCollect(obj, parentKey = '') {
  const values = [];
  if (!obj || typeof obj !== 'object') return values;

  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      values.push(...recursiveCollect(value, fullKey));
    } else {
      values.push({ key: fullKey, value });
    }
  });

  return values;
}

function detectEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
}

function detectPhone(value) {
  return /(^\+?[0-9()\-\s]{8,}$)/.test(String(value));
}

function detectPAN(value) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(value).toUpperCase());
}

function detectCardNumber(value) {
  return /^(?:\d[ -]?){13,19}$/.test(String(value).replace(/\s+/g, ''));
}

function detectAadhaar(value) {
  return /^\d{12}$/.test(String(value));
}

function detectSSN(value) {
  return /^\d{9}$/.test(String(value));
}

function detectIncome(value) {
  return typeof value === 'number' && value > 0;
}

function analyze(event) {
  const flattened = recursiveCollect(event || {});
  const findings = [];

  flattened.forEach(({ key, value }) => {
    if (value === null || value === undefined || value === '') return;

    const norm = String(value).trim();
    const field = key.toLowerCase();

    if (detectPAN(norm)) {
      findings.push({
        field: key,
        entity_type: 'PAN',
        confidence: 0.99,
        action: 'remove',
        reason: 'Sensitive financial identifier'
      });
    }

    if (field.includes('email') && detectEmail(norm)) {
      findings.push({
        field: key,
        entity_type: 'EMAIL',
        confidence: 0.98,
        action: 'mask',
        reason: 'PII email address'
      });
    }

    if ((field.includes('phone') || field.includes('mobile')) && detectPhone(norm)) {
      findings.push({
        field: key,
        entity_type: 'PHONE',
        confidence: 0.96,
        action: 'mask',
        reason: 'PII phone number'
      });
    }

    if (field.includes('card') && detectCardNumber(norm)) {
      findings.push({
        field: key,
        entity_type: 'CARD_NUMBER',
        confidence: 0.97,
        action: 'remove',
        reason: 'Financial information'
      });
    }

    if (field.includes('aadhaar') && detectAadhaar(norm)) {
      findings.push({
        field: key,
        entity_type: 'AADHAAR',
        confidence: 0.99,
        action: 'remove',
        reason: 'National identifier'
      });
    }

    if (field.includes('ssn') && detectSSN(norm)) {
      findings.push({
        field: key,
        entity_type: 'SSN',
        confidence: 0.99,
        action: 'remove',
        reason: 'National identifier'
      });
    }

    if (field.includes('income') && detectIncome(value)) {
      findings.push({
        field: key,
        entity_type: 'INCOME',
        confidence: 0.92,
        action: 'mask_for_ads',
        reason: 'Financial information'
      });
    }
  });

  return findings;
}

function sanitize(event, findings) {
  const clone = JSON.parse(JSON.stringify(event || {}));
  const seen = new Set();

  findings.forEach((finding) => {
    const path = finding.field.split('.');
    let current = clone;

    for (let i = 0; i < path.length - 1; i += 1) {
      if (!current[path[i]]) return;
      current = current[path[i]];
    }

    const leaf = path[path.length - 1];
    if (current && leaf in current) {
      const mark = finding.entity_type === 'INCOME' ? 'MASKED_INCOME' : 'REDACTED';
      current[leaf] = mark;
      seen.add(finding.field);
    }
  });

  return { sanitized: clone, redactedFields: Array.from(seen) };
}

module.exports = { analyze, sanitize };
