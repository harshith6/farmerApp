const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({}));

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

    // For convenience save a small file copy in public/uploads if writable
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      // try to write a small file from the data URL
      const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const b64 = match[2];
        const ext = filename && filename.includes('.') ? path.extname(filename) : (mime.split('/')[1] ? `.${mime.split('/')[1].split('+')[0]}` : '');
        const outName = Date.now() + '-' + Math.round(Math.random()*1e9) + ext;
        fs.writeFileSync(path.join(uploadDir, outName), Buffer.from(b64, 'base64'));
        fileUrl = '/uploads/' + outName;
        console.log('[api/upload] saved file to', fileUrl);
      }
    } catch (e) {
      console.error('[api/upload] failed to write to public/uploads', e && e.stack);
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
