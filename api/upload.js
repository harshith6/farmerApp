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
    // Also ensure we return a usable data URL to the client so it can render the image even if /uploads isn't served.
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
        const outPath = path.join(uploadDir, outName);
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        // On local dev the public/uploads path may be served; on Vercel it's not. Always return a data URL so frontend can render.
        fileUrl = `data:${mime};base64,${b64}`;
        console.log('[api/upload] saved file to DATA_DIR upload path', outPath);
      }
    } catch (e) {
      console.error('[api/upload] failed to write to DATA_DIR/public/uploads', e && e.stack);
      // fallback: ensure returned fileUrl remains a data URL (we already set it earlier from dataUrl)
      fileUrl = dataUrl;
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
