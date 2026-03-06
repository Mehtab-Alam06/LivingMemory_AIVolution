// backend/routes/upload.js  ← NEW FILE
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const authMiddleware = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// POST /api/upload
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // In production (Render), use the deployed URL from env
  const base = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  const url  = `${base}/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;