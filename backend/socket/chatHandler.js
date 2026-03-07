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

    // Send last 50 messages to newly connected user, padding with populated reply objects
    try {
      const history = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .populate('replyTo', 'user text image timestamp')
        .lean();
      
      socket.emit('chat:history', history.reverse());
    } catch (err) {
      console.error('History fetch error:', err);
    }

    // Broadcast online count
    io.emit('chat:online', io.engine.clientsCount);

    // Receive message from client and broadcast to all
    socket.on('chat:message', async (payload) => {
      // payload could be a string (old code) or an object { text, replyTo }
      let text = '';
      let replyTo = null;

      if (typeof payload === 'string') {
        text = payload;
      } else if (typeof payload === 'object' && payload.text) {
        text = payload.text;
        replyTo = payload.replyTo || null;
      }

      if (!text || !text.trim()) return;

      try {
        let msg = await Message.create({
          user: {
            name: socket.user.email.split('@')[0],
            email: socket.user.email
          },
          text: text.trim(),
          replyTo: replyTo
        });

        if (replyTo) {
          msg = await msg.populate('replyTo', 'user text image timestamp');
        }

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