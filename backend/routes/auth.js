// backend/routes/auth.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const OTP     = require('../models/OTP');
const authMiddleware = require('../middleware/authMiddleware');

// ── Email via Brevo HTTPS API ─────────────────────────────────────────────────
// Works on Render free tier (HTTPS not SMTP). Shows YOUR Gmail as the sender.
// Free tier: 300 emails/day. Sign up at https://brevo.com
const sendOtpEmail = async (toEmail, otp) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender:     { name: 'Living Memory', email: process.env.EMAIL_FROM || process.env.EMAIL_USER },
      to:         [{ email: toEmail }],
      subject:    '🌿 Your Living Memory Verification Code',
      htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0e0704;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0704;padding:40px 20px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#d4ab63,#c4922a,#d4ab63,transparent);"></td></tr>
      <tr><td style="background:linear-gradient(160deg,#1e0e06,#2c1a0e,#1a0c05);border:1px solid rgba(212,171,99,0.2);border-top:none;padding:40px 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding-bottom:8px;"><span style="font-size:28px;">🌿</span></td></tr>
          <tr><td align="center" style="padding-bottom:28px;">
            <span style="font-family:Georgia,serif;font-size:26px;color:#f0e8d8;letter-spacing:2px;">
              Living <span style="color:#d4ab63;">Memory</span>
            </span>
          </td></tr>
          <tr><td align="center" style="padding-bottom:28px;">
            <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#c9b99a;line-height:1.6;text-align:center;">
              Your one-time verification code is below.
            </p>
          </td></tr>
          <tr><td align="center" style="padding-bottom:28px;">
            <table cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,0.4);border:1px solid rgba(212,171,99,0.35);border-radius:4px;width:100%;">
              <tr><td align="center" style="padding:10px 20px 6px;">
                <span style="font-family:'Courier New',monospace;font-size:10px;color:#c4922a;letter-spacing:4px;text-transform:uppercase;">ONE-TIME PASSCODE</span>
              </td></tr>
              <tr><td align="center" style="padding:8px 20px 16px;">
                <span style="font-family:'Courier New',monospace;font-size:48px;font-weight:bold;color:#d4ab63;letter-spacing:14px;">${otp}</span>
              </td></tr>
            </table>
          </td></tr>
          <tr><td align="center">
            <p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#7b6b5a;text-align:center;">
              Expires in <strong style="color:#c9b99a;">5 minutes</strong>.
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#d4ab63,#c4922a,#d4ab63,transparent);"></td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Brevo error: ${JSON.stringify(err)}`);
  }
};

// POST /api/auth/send-otp  (works for both register + login)
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email: email.toLowerCase() });
    await OTP.create({ email: email.toLowerCase(), otp });
    await sendOtpEmail(email, otp);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/register  ← NEW: saves the real name
router.post('/register', async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    if (!email || !otp || !name?.trim())
      return res.status(400).json({ error: 'Name, email and OTP required' });

    const record = await OTP.findOne({ email: email.toLowerCase(), otp });
    if (!record) return res.status(400).json({ error: 'Invalid or expired OTP' });
    await OTP.deleteMany({ email: email.toLowerCase() });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Account already exists. Please sign in instead.' });

    const user = await User.create({ email: email.toLowerCase(), name: name.trim() });
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/verify-otp  (login for existing users)
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email: email.toLowerCase(), otp });
    if (!record) return res.status(400).json({ error: 'Invalid or expired OTP' });
    await OTP.deleteMany({ email: email.toLowerCase() });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'No account found. Please register first.' });

    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { email: user.email, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// PATCH /api/auth/profile  (update display name)
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const user = await User.findByIdAndUpdate(req.user.userId, { name: name.trim() }, { new: true });
    res.json({ email: user.email, name: user.name });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;