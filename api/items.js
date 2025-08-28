const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'farmerapp-data');
const ITEMS_FILE = path.join(DATA_DIR, 'items.json');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('[api/items] could not create DATA_DIR', DATA_DIR, e && e.message); }
if (!fs.existsSync(ITEMS_FILE)) try { fs.writeFileSync(ITEMS_FILE, JSON.stringify([])); } catch (e) { console.error('[api/items] failed to create items.json in DATA_DIR', e && e.message); }

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const items = JSON.parse(fs.readFileSync(ITEMS_FILE));
      return res.json(items);
    }
    if (req.method === 'POST') {
      const { name, description, price } = req.body || {};
      if (!name || !price) return res.status(400).json({ error: 'name and price required' });
      const items = JSON.parse(fs.readFileSync(ITEMS_FILE));
      const item = { id: uuidv4(), name, description: description||'', price: Number(price) };
      items.push(item);
      fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
      return res.json(item);
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error('[api/items] error', e && e.stack);
    return res.status(500).json({ error: 'internal' });
  }
};
