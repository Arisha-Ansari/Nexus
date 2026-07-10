const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function setupSignalingServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*', // production mein exact frontend URL daalo
      methods: ['GET', 'POST']
    }
  });

  // Socket connect hone se pehle JWT verify karo — sirf logged-in users hi join kar sakein
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

    // User ek meeting room join karta hai
    socket.on('join-meeting', ({ meetingId }) => {
      socket.join(meetingId);
      socket.currentMeetingId = meetingId;

      // Room mein pehle se maujood doosre users ko batao ki naya banda aaya
      socket.to(meetingId).emit('user-joined', { socketId: socket.id });

      console.log(`Socket ${socket.id} joined meeting ${meetingId}`);
    });

    // Offer ko specific socket tak relay karo
    socket.on('offer', ({ offer, to }) => {
      io.to(to).emit('offer', { offer, from: socket.id });
    });

    // Answer ko specific socket tak relay karo
    socket.on('answer', ({ answer, to }) => {
      io.to(to).emit('answer', { answer, from: socket.id });
    });

    // ICE candidate ko specific socket tak relay karo
    socket.on('ice-candidate', ({ candidate, to }) => {
      io.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Meeting chhodne pe doosron ko batao
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