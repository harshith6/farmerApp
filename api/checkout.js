const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'farmerapp-data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('[api/checkout] could not create DATA_DIR', DATA_DIR, e && e.message); }
if (!fs.existsSync(USERS_FILE)) try { fs.writeFileSync(USERS_FILE, JSON.stringify({})); } catch (e) { console.error('[api/checkout] failed to create users.json in DATA_DIR', e && e.message); }

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
    const { userId, total } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    if (!users[userId]) return res.status(400).json({ error: 'user not found' });
    const t = Number(total || 0);
    if (users[userId].points < t) return res.status(400).json({ error: 'insufficient points' });
    users[userId].points -= t;
    if (!users[userId].orders) users[userId].orders = [];
    const order = { id: uuidv4(), total: t, createdAt: new Date().toISOString() };
    users[userId].orders.push(order);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return res.json({ ok: true, order, points: users[userId].points });
  } catch (e) {
    console.error('[api/checkout] error', e && e.stack);
    return res.status(500).json({ error: 'internal' });
  }
};
