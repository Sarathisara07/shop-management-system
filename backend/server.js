require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const cashRoutes = require('./routes/cashRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Socket logic
io.on('connection', (socket) => {
  socket.on('join', (room) => {
    socket.join(room);
  });
});

// Make io accessible in routes
app.set('socketio', io);

// Routes
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB local connection successful'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server with Socket.io running on http://localhost:${PORT}`);
  if (process.env.GEMINI_API_KEY) {
    console.log("AI Assistant: API Key LOADED");
  }
});
