const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────
// PORT (Render uses dynamic port)
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;


// ─────────────────────────────────────────────
// ALLOWED ORIGINS
// ─────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://living-memory-ai-volution.vercel.app"
];


// ─────────────────────────────────────────────
// CORS CONFIGURATION
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {

      // allow requests with no origin (mobile apps, curl etc)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  })
);

app.use(express.json());


// ─────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});


// ─────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));


// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/uploads", express.static("uploads"));
app.use("/api/upload", require("./routes/upload"));


// ─────────────────────────────────────────────
// ROOT ROUTE
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "🌿 Living Memory API is running"
  });
});


// ─────────────────────────────────────────────
// SOCKET CHAT HANDLER
// ─────────────────────────────────────────────
require("./socket/chatHandler")(io);


// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});