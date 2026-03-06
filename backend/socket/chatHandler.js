const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

module.exports = (io) => {

  // Verify JWT for every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Connected: ${socket.user.email}`);

    // Send last 50 messages to newly connected user
    try {
      const history = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      socket.emit('chat:history', history.reverse());
    } catch (err) {
      console.error('History fetch error:', err);
    }

    // Broadcast online count
    io.emit('chat:online', io.engine.clientsCount);

    // Receive message from client and broadcast to all
    socket.on('chat:message', async (text) => {
      if (!text || !text.trim()) return;
      try {
        const msg = await Message.create({
          user: {
            name: socket.user.email.split('@')[0],
            email: socket.user.email
          },
          text: text.trim()
        });
        io.emit('chat:message', msg);
      } catch (err) {
        console.error('Message save error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.user.email}`);
      io.emit('chat:online', io.engine.clientsCount);
    });
  });
};