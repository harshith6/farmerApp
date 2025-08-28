const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));

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
