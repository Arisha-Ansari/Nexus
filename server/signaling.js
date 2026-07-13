const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function setupSignalingServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*', 
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id || decoded._id;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    socket.on('join-meeting', ({ meetingId }) => {
      socket.join(meetingId);
      socket.currentMeetingId = meetingId;

      socket.to(meetingId).emit('user-joined', { socketId: socket.id });

      console.log(`Socket ${socket.id} joined meeting ${meetingId}`);
    });

    socket.on('offer', ({ offer, to }) => {
      io.to(to).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ answer, to }) => {
      io.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to }) => {
      io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('leave-meeting', ({ meetingId }) => {
      socket.to(meetingId).emit('user-left', { socketId: socket.id });
      socket.leave(meetingId);
    });

    socket.on('disconnect', () => {
      if (socket.currentMeetingId) {
        socket.to(socket.currentMeetingId).emit('user-left', { socketId: socket.id });
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = setupSignalingServer;