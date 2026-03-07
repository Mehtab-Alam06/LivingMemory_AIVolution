// backend/routes/auth.js

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const OTP = require("../models/OTP");
const authMiddleware = require("../middleware/authMiddleware");


// ─────────────────────────────────────────────
// Nodemailer Transporter
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
    family: 4,
    connectionTimeout: 15000,
    tls: { rejectUnauthorized: false },
  });


// ─────────────────────────────────────────────
// Send OTP Email Function
// ─────────────────────────────────────────────

const sendOtpEmail = async (toEmail, otp) => {

  const mailOptions = {
    from: `"Living Memory" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🌿 Your Living Memory Verification Code",

    html: `
<!DOCTYPE html>
<html>
<body style="background:#0e0704;font-family:Georgia,serif;padding:40px">

<div style="max-width:480px;margin:auto;background:#1e0e06;border:1px solid #d4ab63;padding:30px">

<h2 style="text-align:center;color:#d4ab63">🌿 Living Memory</h2>

<p style="color:#c9b99a;text-align:center">
Your one-time verification code is below
</p>

<div style="
background:black;
border:1px solid #d4ab63;
text-align:center;
padding:20px;
font-size:40px;
letter-spacing:12px;
color:#d4ab63;
font-family:monospace">

${otp}

</div>

<p style="text-align:center;color:#aaa;margin-top:20px">
Expires in <b>5 minutes</b>
</p>

</div>

</body>
</html>
`
  };

  await transporter.sendMail(mailOptions);
};



// ─────────────────────────────────────────────
// Check if email exists
// ─────────────────────────────────────────────

router.post("/check-email", async (req, res) => {

  try {

    const { email } = req.body;

    if (!email)
      return res.status(400).json({ error: "Email required" });

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    res.json({
      exists: !!user
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Server error" });

  }

});



// ─────────────────────────────────────────────
// Send OTP (Register + Login)
// ─────────────────────────────────────────────

router.post("/send-otp", async (req, res) => {

  try {

    const { email } = req.body;

    if (!email || !email.includes("@"))
      return res.status(400).json({ error: "Valid email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.deleteMany({ email: email.toLowerCase() });

    await OTP.create({
      email: email.toLowerCase(),
      otp
    });

    console.log("Sending OTP to:", email);

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP sent successfully" });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Failed to send OTP" });

  }

});



// ─────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────

router.post("/register", async (req, res) => {

  try {

    const { email, otp, name } = req.body;

    if (!email || !otp || !name?.trim())
      return res.status(400).json({ error: "Name, email and OTP required" });

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      otp
    });

    if (!record)
      return res.status(400).json({ error: "Invalid or expired OTP" });

    await OTP.deleteMany({ email: email.toLowerCase() });

    const exists = await User.findOne({ email: email.toLowerCase() });

    if (exists)
      return res.status(400).json({
        error: "Account already exists. Please sign in instead."
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

    res.json({
      token,
      user: {
        email: user.email,
        name: user.name
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({ error: "Registration failed" });

  }

});



// ─────────────────────────────────────────────
// Login with OTP
// ─────────────────────────────────────────────

router.post("/verify-otp", async (req, res) => {

  try {

    const { email, otp } = req.body;

    const record = await OTP.findOne({
      email: email.toLowerCase(),
      otp
    });

    if (!record)
      return res.status(400).json({ error: "Invalid or expired OTP" });

    await OTP.deleteMany({ email: email.toLowerCase() });

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user)
      return res.status(404).json({
        error: "No account found. Please register first."
      });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        email: user.email,
        name: user.name
      }
    });

  } catch {

    res.status(500).json({ error: "Login failed" });

  }

});



// ─────────────────────────────────────────────
// Update Profile
// ─────────────────────────────────────────────

router.patch("/profile", authMiddleware, async (req, res) => {

  try {

    const { name } = req.body;

    if (!name?.trim())
      return res.status(400).json({ error: "Name required" });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name: name.trim() },
      { new: true }
    );

    res.json({
      email: user.email,
      name: user.name
    });

  } catch {

    res.status(500).json({ error: "Update failed" });

  }

});



// ─────────────────────────────────────────────
// Get Current User
// ─────────────────────────────────────────────

router.get("/me", authMiddleware, async (req, res) => {

  try {

    const user = await User
      .findById(req.user.userId)
      .select("-__v");

    if (!user)
      return res.status(404).json({ error: "User not found" });

    res.json(user);

  } catch {

    res.status(500).json({ error: "Server error" });

  }

});


module.exports = router;