const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const jwt        = require('jsonwebtoken');
const User       = require('../models/User');
const OTP        = require('../models/OTP');
const authMiddleware = require('../middleware/authMiddleware');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"Living Memory" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🌿 Your Living Memory Verification Code',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1c0d04;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c0d04;padding:40px 20px;">
  <tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%;border:1px solid rgba(212,171,99,0.25);border-radius:6px;overflow:hidden;">

    <tr><td style="background:linear-gradient(90deg,#2c1a0e,#3d2010,#2c1a0e);padding:14px 28px;border-bottom:1px solid rgba(212,171,99,0.18);">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.2em;color:rgba(212,171,99,0.55);text-transform:uppercase;">
        🌿 &nbsp;LIVING MEMORY PROJECT — ODISHA, INDIA
      </p>
    </td></tr>

    <tr><td style="background:#2a1508;padding:36px 28px 32px;">
      <h2 style="margin:0 0 8px;font-size:28px;color:#f0e8d8;font-weight:normal;">Enter the Archive</h2>
      <p style="margin:0 0 28px;font-size:15px;color:rgba(212,171,99,0.65);font-style:italic;">Your one-time verification code is below</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="background:rgba(0,0,0,0.4);border:1px solid rgba(212,171,99,0.22);border-radius:4px;padding:24px 20px;text-align:center;">
          <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.2em;color:rgba(212,171,99,0.45);text-transform:uppercase;">ONE TIME PASSCODE</p>
          <p style="margin:0;font-size:44px;font-weight:bold;color:#d4ab63;letter-spacing:14px;font-family:'Courier New',monospace;">${otp}</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:14px;color:rgba(240,232,216,0.4);text-align:center;">
        Valid for <strong style="color:rgba(212,171,99,0.6);">5 minutes</strong>. Do not share this code with anyone.
      </p>
    </td></tr>

    <tr><td style="background:#1c0d04;padding:14px 28px;border-top:1px solid rgba(212,171,99,0.1);">
      <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.14em;color:rgba(212,171,99,0.2);text-align:center;text-transform:uppercase;">
        Preserving the Wisdom of Odisha Before It Is Lost Forever
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`
  });
};

// POST /api/auth/send-otp
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

// POST /api/auth/check-email
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    if (!email || !otp || !name?.trim()) return res.status(400).json({ error: 'Name, email and OTP required' });
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

// POST /api/auth/verify-otp  (login)
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

// PATCH /api/auth/profile
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