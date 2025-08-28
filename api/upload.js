const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Use a writable directory: prefer process.env.DATA_DIR, then os.tmpdir().
const DATA_DIR = process.env.DATA_DIR || path.join(os.tmpdir(), 'farmerapp-data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { console.error('[api/upload] could not create DATA_DIR', DATA_DIR, e && e.message); }
if (!fs.existsSync(USERS_FILE)) try { fs.writeFileSync(USERS_FILE, JSON.stringify({})); } catch (e) { console.error('[api/upload] failed to create users.json in DATA_DIR', e && e.message); }

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { userId, filename, dataUrl } = req.body || {};
    console.log('[api/upload] body keys:', Object.keys(req.body || {}));
    if (!dataUrl) return res.status(400).json({ error: 'dataUrl required' });

    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    const uid = userId || 'guest';
    if (!users[uid]) users[uid] = { id: uid, points: 0, uploads: [] };

    const points = 100; // demo points
    users[uid].points += points;

    // dataUrl may be a data: URL (preferred) or a plain base64 string
    let fileUrl = dataUrl;

    // For convenience save a small file copy in a writable uploads dir (use DATA_DIR/public/uploads)
    try {
      const uploadDir = path.join(DATA_DIR, 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      // try to write a small file from the data URL
      const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const b64 = match[2];
        const ext = filename && filename.includes('.') ? path.extname(filename) : (mime.split('/')[1] ? `.${mime.split('/')[1].split('+')[0]}` : '');
        const outName = Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
        fs.writeFileSync(path.join(uploadDir, outName), Buffer.from(b64, 'base64'));
        // Note: this path is not served by Vercel static files; frontend can render data URLs or take fileUrl returned
        fileUrl = '/uploads/' + outName; // still useful for local dev
        console.log('[api/upload] saved file to DATA_DIR upload path', fileUrl);
      }
    } catch (e) {
      console.error('[api/upload] failed to write to DATA_DIR/public/uploads', e && e.stack);
    }

    const uploadRecord = { id: uuidv4(), file: fileUrl, points, createdAt: new Date().toISOString() };
    users[uid].uploads.push(uploadRecord);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log('[api/upload] users.json updated for', uid);

    return res.json({ user: users[uid], upload: uploadRecord });
  } catch (e) {
    console.error('[api/upload] error', e && e.stack);
    return res.status(500).json({ error: 'internal' });
  }
};
