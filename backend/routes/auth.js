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
      htmlContent: `
      <div style="font-family:Arial;padding:30px;background:#111;color:white">
        <h2>🌿 Living Memory</h2>
        <p>Your OTP code is:</p>

        <h1 style="
        letter-spacing:8px;
        background:black;
        padding:20px;
        border:1px solid #d4ab63;
        display:inline-block">
        ${otp}
        </h1>

        <p>This code expires in 5 minutes.</p>
      </div>
      `
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
      { userId: user._id, email: user.email },
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
      { userId: user._id, email: user.email },
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