const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const OTP = require("../models/OTP");
const authMiddleware = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────
// Send OTP Email via Brevo API
// ─────────────────────────────────────────────

const sendOtpEmail = async (toEmail, otp) => {

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: "Living Memory",
        email: "livingmemory104@gmail.com"
      },
      to: [
        {
          email: toEmail
        }
      ],
      subject: "🌿 Living Memory Verification Code",
      htmlContent: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0e0602;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e0602;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:linear-gradient(160deg,#2a1a08 0%,#1c0d04 60%,#120800 100%);border-radius:16px;border:1px solid rgba(212,171,99,0.25);overflow:hidden;">
        
        <!-- TOP HEADER BAR -->
        <tr>
          <td style="background:linear-gradient(90deg,rgba(212,171,99,0.12),rgba(212,171,99,0.06),rgba(212,171,99,0.12));padding:16px 32px;border-bottom:1px solid rgba(212,171,99,0.15);text-align:center;">
            <span style="font-size:18px;">🌿</span>
            <span style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.22em;color:rgba(212,171,99,0.6);text-transform:uppercase;vertical-align:middle;margin-left:8px;">LIVING MEMORY PROJECT</span>
          </td>
        </tr>

        <!-- MAIN CONTENT -->
        <tr>
          <td style="padding:40px 40px 32px;text-align:center;">
            <h1 style="margin:0 0 8px;font-size:34px;font-weight:300;color:#e8d8b8;letter-spacing:0.04em;font-family:Georgia,serif;">Enter the Archive</h1>
            <p style="margin:0 0 32px;font-size:15px;color:rgba(212,171,99,0.55);font-style:italic;letter-spacing:0.03em;">Your one-time verification code</p>

            <!-- DIVIDER -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="border-top:1px solid rgba(212,171,99,0.15);"></td>
                <td style="padding:0 12px;white-space:nowrap;color:rgba(212,171,99,0.3);font-size:10px;font-family:'Courier New',monospace;letter-spacing:0.15em;">✦</td>
                <td style="border-top:1px solid rgba(212,171,99,0.15);"></td>
              </tr>
            </table>

            <!-- OTP DIGIT BOXES -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
              <tr>
                ${otp.split('').map(d => `
                <td style="padding:0 5px;">
                  <div style="width:52px;height:64px;line-height:64px;text-align:center;font-family:'Courier New',monospace;font-size:32px;font-weight:700;color:#d4ab63;background:rgba(212,171,99,0.07);border:1px solid rgba(212,171,99,0.28);border-radius:8px;border-bottom:2px solid rgba(212,171,99,0.45);box-shadow:0 4px 16px rgba(0,0,0,0.3),inset 0 1px 0 rgba(212,171,99,0.1);">${d}</div>
                </td>`).join('')}
              </tr>
            </table>

            <!-- DIVIDER -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="border-top:1px solid rgba(212,171,99,0.15);"></td>
                <td style="padding:0 12px;white-space:nowrap;color:rgba(212,171,99,0.3);font-size:10px;font-family:'Courier New',monospace;letter-spacing:0.15em;">✦</td>
                <td style="border-top:1px solid rgba(212,171,99,0.15);"></td>
              </tr>
            </table>

            <p style="margin:0 0 6px;font-size:14px;color:rgba(237,224,190,0.65);line-height:1.7;">Valid for <strong style="color:#d4ab63;font-weight:600;">5 minutes</strong> only.</p>
            <p style="margin:0;font-size:13px;color:rgba(237,224,190,0.35);">Do not share this code with anyone.</p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:16px 32px 24px;text-align:center;border-top:1px solid rgba(212,171,99,0.1);">
            <p style="margin:0;font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.18em;color:rgba(212,171,99,0.22);text-transform:uppercase;">Preserving the Wisdom of Odisha Before It Is Lost Forever</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

};


// ─────────────────────────────────────────────
// Check Email
// ─────────────────────────────────────────────

router.post("/check-email", async (req, res) => {

  try {

    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Email required" });

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    res.json({ exists: !!user });

  } catch (err) {

    console.error("CHECK EMAIL ERROR:", err);

    res.status(500).json({ error: "Server error" });

  }

});


// ─────────────────────────────────────────────
// Send OTP
// ─────────────────────────────────────────────

router.post("/send-otp", async (req, res) => {

  try {

    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Valid email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.deleteMany({
      email: email.toLowerCase()
    });

    await OTP.create({
      email: email.toLowerCase(),
      otp
    });

    console.log("📨 Sending OTP to:", email);

    await sendOtpEmail(email, otp);

    res.json({
      message: "OTP sent successfully"
    });

  } catch (err) {

    console.error("❌ OTP ERROR:", err);

    res.status(500).json({
      error: "Failed to send OTP"
    });

  }

});


// ─────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────

router.post("/register", async (req, res) => {

  try {

    const { email, otp, name } = req.body;

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      otp
    });

    if (!record)
      return res.status(400).json({ error: "Invalid OTP" });

    await OTP.deleteMany({
      email: email.toLowerCase()
    });

    const exists = await User.findOne({
      email: email.toLowerCase()
    });

    if (exists)
      return res.status(400).json({
        error: "Account already exists"
      });

    const user = await User.create({
      email: email.toLowerCase(),
      name: name.trim()
    });

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });

  } catch (err) {

    console.error("REGISTER ERROR:", err);

    res.status(500).json({
      error: "Registration failed"
    });

  }

});


// ─────────────────────────────────────────────
// Verify OTP Login
// ─────────────────────────────────────────────

router.post("/verify-otp", async (req, res) => {

  try {

    const { email, otp } = req.body;

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      otp
    });

    if (!record)
      return res.status(400).json({
        error: "Invalid OTP"
      });

    await OTP.deleteMany({
      email: email.toLowerCase()
    });

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user)
      return res.status(404).json({
        error: "User not found"
      });

    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });

  } catch (err) {

    console.error("LOGIN ERROR:", err);

    res.status(500).json({
      error: "Login failed"
    });

  }

});


// ─────────────────────────────────────────────
// Update Profile
// ─────────────────────────────────────────────

router.patch("/profile", authMiddleware, async (req, res) => {

  try {

    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name },
      { new: true }
    );

    res.json(user);

  } catch (err) {

    console.error("PROFILE ERROR:", err);

    res.status(500).json({
      error: "Update failed"
    });

  }

});


// ─────────────────────────────────────────────
// Get Current User
// ─────────────────────────────────────────────

router.get("/me", authMiddleware, async (req, res) => {

  try {

    const user = await User.findById(req.user.userId);

    res.json(user);

  } catch (err) {

    console.error("ME ERROR:", err);

    res.status(500).json({
      error: "Server error"
    });

  }

});

module.exports = router;