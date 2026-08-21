const tokenInput = document.getElementById('tokenInput');
const ingestBtn = document.getElementById('submitEvent');
const ingestResult = document.getElementById('ingestResult');
const eventInput = document.getElementById('eventInput');

const decisionBtn = document.getElementById('requestDecision');
const decisionInput = document.getElementById('decisionInput');
const decisionResult = document.getElementById('decisionResult');

const listAuditsBtn = document.getElementById('listAudits');
const auditList = document.getElementById('auditList');
const nodeDetails = document.getElementById('nodeDetails');

const graphMeta = {
  source: {
    title: 'Customer Event',
    body: 'Event enters the CDP and is evaluated for policy, quality, and risk.'
  },
  guard: {
    title: 'PII Guard',
    body: 'Sensitive fields are detected and classified (PAN, email, phone, income, card info).'
  },
  policy: {
    title: 'Policy Engine',
    body: 'Consent, destination restrictions, and legal policies are enforced before activation.'
  },
  model: {
    title: 'Model Score',
    body: 'The propensity or next-best-action model produces a score for the customer or action.'
  },
  decision: {
    title: 'Decision',
    body: 'The final action is allow, modify, deny, or review depending on policy and confidence.'
  }
};

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenInput.value || 'analyst-token'}`
  };
}

function bindNodeInteractions() {
  document.querySelectorAll('.node').forEach((node) => {
    node.addEventListener('click', () => {
      const key = node.dataset.node;
      const meta = graphMeta[key];
      nodeDetails.innerHTML = `<strong>Selected step:</strong> ${meta.title}<div class="detail-body">${meta.body}</div>`;
    });
  });
}

bindNodeInteractions();

ingestBtn.onclick = async () => {
  const body = JSON.parse(eventInput.value);
  const res = await fetch('/ingest', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  ingestResult.textContent = JSON.stringify(json, null, 2);
};

decisionBtn.onclick = async () => {
  const body = JSON.parse(decisionInput.value);
  const res = await fetch('/decide', { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) });
  const json = await res.json();
  decisionResult.textContent = JSON.stringify(json, null, 2);
};

listAuditsBtn.onclick = async () => {
  const res = await fetch('/audit', { headers: authHeaders() });
  const list = await res.json();
  auditList.textContent = JSON.stringify(list, null, 2);
};
