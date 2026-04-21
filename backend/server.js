const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./src/config/db');
const userRoutes = require('./src/routes/user.routes');
const messageRoutes = require('./src/routes/message.routes');
const socketHandler = require('./src/socket/socket.handler');

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: [
      "https://chat-bot-app-898l.vercel.app",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ── Middlewares ──
app.use(helmet());
app.use(cors({
  origin: [
    "https://chat-bot-app-898l.vercel.app",
    "http://localhost:3000"
  ],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ── DB Connect ──
connectDB();

// ── Routes ──
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// ── Socket ──
socketHandler(io);

// ── Start ──
server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});