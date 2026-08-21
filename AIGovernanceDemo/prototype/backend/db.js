const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const memoryFile = path.join(__dirname, 'audit_store.json');
let memoryStore = [];
let client = null;
let dbReady = false;

function loadMemoryStore() {
  if (fs.existsSync(memoryFile)) {
    try {
      const raw = fs.readFileSync(memoryFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) memoryStore = parsed;
    } catch (err) {
      console.warn('Unable to parse fallback audit store; using empty in-memory store.');
      memoryStore = [];
    }
  }
}

function saveMemoryStore() {
  fs.writeFileSync(memoryFile, JSON.stringify(memoryStore, null, 2));
}

function initDatabase() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_gov';

  try {
    client = new Client({ connectionString });
    client.connect().then(() => {
      dbReady = true;
      console.log('Connected to PostgreSQL via DATABASE_URL');
      ensureSchema();
    }).catch((err) => {
      console.warn('PostgreSQL unavailable. Falling back to file-backed prototype store.', err.message);
      dbReady = false;
      loadMemoryStore();
    });
  } catch (err) {
    console.warn('Unable to initialize PostgreSQL client. Falling back to file-backed prototype store.', err.message);
    dbReady = false;
    loadMemoryStore();
  }
}

async function ensureSchema() {
  if (!client || !dbReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS ingested_events (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(255),
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_records (
      id SERIAL PRIMARY KEY,
      audit_id VARCHAR(255) UNIQUE,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function addEvent(event) {
  const payload = {
    ...event,
    created_at: new Date().toISOString()
  };

  if (client && dbReady) {
    const res = await client.query(
      `INSERT INTO ingested_events (event_id, payload) VALUES ($1, $2) RETURNING *`,
      [payload.event || payload.user_id || `evt_${Date.now()}`, payload]
    );
    return res.rows[0];
  }

  memoryStore.push({ type: 'event', payload, created_at: payload.created_at });
  saveMemoryStore();
  return payload;
}

async function addAudit(audit) {
  if (client && dbReady) {
    const res = await client.query(
      `INSERT INTO audit_records (audit_id, payload) VALUES ($1, $2) RETURNING *`,
      [audit.audit_id, audit]
    );
    return res.rows[0];
  }

  memoryStore.push({ type: 'audit', payload: audit, created_at: audit.timestamp || new Date().toISOString() });
  saveMemoryStore();
  return audit;
}

async function getAuditById(id) {
  if (client && dbReady) {
    const res = await client.query('SELECT payload FROM audit_records WHERE audit_id = $1', [id]);
    return res.rows[0] ? res.rows[0].payload : null;
  }

  const found = memoryStore.filter(item => item.type === 'audit').map(item => item.payload).find(item => item.audit_id === id);
  return found || null;
}

async function listAudits() {
  if (client && dbReady) {
    const res = await client.query('SELECT payload FROM audit_records ORDER BY created_at DESC');
    return res.rows.map(row => row.payload);
  }

  return memoryStore.filter(item => item.type === 'audit').map(item => item.payload);
}

async function listEvents() {
  if (client && dbReady) {
    const res = await client.query('SELECT payload FROM ingested_events ORDER BY created_at DESC');
    return res.rows.map(row => row.payload);
  }

  return memoryStore.filter(item => item.type === 'event').map(item => item.payload);
}

initDatabase();

module.exports = {
  addEvent,
  addAudit,
  getAuditById,
  listAudits,
  listEvents,
  isConnected: () => dbReady,
  client
};
