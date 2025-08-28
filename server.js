const express = require('express');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// simple JSON stores (not for production)
const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
const ITEMS_FILE = path.join(DB_DIR, 'items.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');

if (!fs.existsSync(ITEMS_FILE)) fs.writeFileSync(ITEMS_FILE, JSON.stringify([]));
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));

// Multer setup for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage });

// API: add item (farmer)
app.post('/api/items', (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE));
  const { name, description, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price required' });
  const item = { id: uuidv4(), name, description: description || '', price: Number(price) };
  items.push(item);
  fs.writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2));
  res.json(item);
});

// API: list items
app.get('/api/items', (req, res) => {
  const items = JSON.parse(fs.readFileSync(ITEMS_FILE));
  res.json(items);
});

// API: upload planting image (user) -> award points
app.post('/api/upload', upload.single('image'), (req, res) => {
  const { userId } = req.body;
  if (!req.file) return res.status(400).json({ error: 'image required' });
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const uid = userId || 'guest';
  if (!users[uid]) users[uid] = { id: uid, points: 0, uploads: [] };
  // simple points calc: 100 points per upload (demo)
  const points = 100;
  users[uid].points += points;
  const uploadRecord = { id: uuidv4(), file: '/uploads/' + path.basename(req.file.path), points, createdAt: new Date().toISOString() };
  users[uid].uploads.push(uploadRecord);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ user: users[uid], upload: uploadRecord });
});

// API: get user
app.get('/api/user/:id', (req, res) => {
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const u = users[req.params.id] || { id: req.params.id, points: 0, uploads: [] };
  res.json(u);
});

// API: checkout - spend points
app.post('/api/checkout', (req, res) => {
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
  res.json({ ok: true, order, points: users[userId].points });
});

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server running on', port));
