const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.use('/api/auth', require('./routes/auth'));

// 2. Serve uploaded images as static files
app.use('/uploads', express.static('uploads'));

// 3. Register the upload route
app.use('/api/upload', require('./routes/upload'));

app.get('/', (req, res) => {
  res.json({ status: '🌿 Living Memory API is running' });
});

require('./socket/chatHandler')(io);

server.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});