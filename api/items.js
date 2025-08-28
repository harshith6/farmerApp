const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_DIR = path.join(process.cwd(), 'data');
const ITEMS_FILE = path.join(DB_DIR, 'items.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(ITEMS_FILE)) fs.writeFileSync(ITEMS_FILE, JSON.stringify([]));

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
