require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const setupSignalingServer = require('./signaling');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);
const meetingRoutes = require('./routes/meetings');
app.use('/api/meetings', meetingRoutes);
const documentRoutes = require('./routes/documents');
app.use('/api/documents', documentRoutes);

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('Nexus backend is alive');
});

const PORT = process.env.PORT || 5000;

// Express app ko raw http server pe attach karo, taaki Socket.IO bhi usi server pe chal sake
const server = http.createServer(app);
setupSignalingServer(server);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));