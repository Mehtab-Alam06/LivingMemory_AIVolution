const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://living-memory-ai-volution.vercel.app",
  "https://livingmemory-aivolution.vercel.app",
  "https://living-memory-aivolution.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin")); // Admin logic
app.use("/uploads", express.static("uploads"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/interviews", require("./routes/Interviews"));
app.use("/api/ai", require("./routes/Ai")); // ← Gemini AI proxy
app.use("/api/knowledge", require("./routes/knowledge"));
app.use("/api/analysis", require("./routes/analysis")); // AI Analysis Routes
app.use("/api/graph", require("./routes/graph")); // Knowledge Graph Routes
app.use("/api/mentor", require("./routes/mentor")); // RAG Web Search & Videos

app.get("/", (req, res) => {
  res.json({ status: "🌿 Living Memory API is running" });
});

require("./socket/chatHandler")(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
