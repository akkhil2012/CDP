const fs = require('fs');
const path = require('path');

const auditFile = path.join(__dirname, 'audit_store.json');
let store = [];

if (fs.existsSync(auditFile)) {
  try {
    store = JSON.parse(fs.readFileSync(auditFile));
  } catch (e) {
    console.warn('Could not parse existing audit file, starting fresh.');
    store = [];
  }
}

function save() {
  fs.writeFileSync(auditFile, JSON.stringify(store, null, 2));
}

function add(record) {
  store.push(record);
  save();
}

function get(id) {
  return store.find(r => r.audit_id === id);
}

function all() {
  return store;
}

module.exports = { add, get, all };
