const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ─── 1. DYNAMIC PORT ────────────────────────────────────────────────────────
// Render provides a port via process.env.PORT. We must use it!
const PORT = process.env.PORT || 5000;

// ─── 2. CORS CONFIGURATION (EASY FIX) ───────────────────────────────────────
// This allows your Vercel frontend to talk to your Render backend
const corsOptions = {
  origin: 'https://livingmemory-aivolution.onrender.com', // Allows all origins - easiest for initial deployment
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── 3. SOCKET.IO SETUP ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: corsOptions // Use the same easy CORS settings for sockets
});

// ─── 4. DATABASE & ROUTES ───────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.use('/api/auth', require('./routes/auth'));
app.use('/uploads', express.static('uploads'));
app.use('/api/upload', require('./routes/upload'));

app.get('/', (req, res) => {
  res.json({ status: '🌿 Living Memory API is running' });
});

// Load your chat logic
require('./socket/chatHandler')(io);

// ─── 5. START SERVER ────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});