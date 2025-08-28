const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'farmerapp-data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('[api/user] could not create DATA_DIR', DATA_DIR, e && e.message); }
if (!fs.existsSync(USERS_FILE)) try { fs.writeFileSync(USERS_FILE, JSON.stringify({})); } catch (e) { console.error('[api/user] failed to create users.json in DATA_DIR', e && e.message); }

module.exports = async (req, res) => {
  try {
    const id = req.query.id || req.params.id;
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const u = users[id] || { id, points: 0, uploads: [] };
    return res.json(u);
  } catch (e) {
    console.error('[api/user] error', e && e.stack);
    return res.status(500).json({ error: 'internal' });
  }
};
