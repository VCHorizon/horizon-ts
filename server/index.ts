import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

interface ChatMessage {
  username: string;
  text: string;
  timestamp: string;
}

interface UserJoinedPayload {
  username: string;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Handle user joining
  socket.on('user:joined', (data: UserJoinedPayload) => {
    console.log(`${data.username} joined the chat`);
    socket.broadcast.emit('user:joined', {
      username: data.username,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Handle chat messages
  socket.on('chat:message', (message: ChatMessage) => {
    console.log('Message received:', message);
    // Broadcast to all clients including sender
    io.emit('chat:message', {
      ...message,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
