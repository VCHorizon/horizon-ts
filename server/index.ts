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

interface Reaction {
  emoji: string;
  users: string[];
}

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  reactions: Reaction[];
  isEdited?: boolean;
}

interface UserJoinedPayload {
  username: string;
}

interface ReactionPayload {
  messageId: string;
  emoji: string;
  username: string;
}

interface EditMessagePayload {
  messageId: string;
  newText: string;
  username: string;
}

interface DeleteMessagePayload {
  messageId: string;
  username: string;
}

// Store messages in memory for reaction tracking
const messages = new Map<string, ChatMessage>();

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
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString(),
      reactions: message.reactions || [],
    };
    // Store message for reaction tracking
    messages.set(message.id, messageWithTimestamp);
    // Broadcast to all clients including sender
    io.emit('chat:message', messageWithTimestamp);
  });
  
  // Handle message reactions
  socket.on('message:reaction', (payload: ReactionPayload) => {
    console.log('Reaction received:', payload);
    const message = messages.get(payload.messageId);
    
    if (message) {
      // Find existing reaction for this emoji
      const existingReaction = message.reactions.find(r => r.emoji === payload.emoji);
      
      if (existingReaction) {
        // Toggle: if user already reacted, remove them; otherwise add them
        if (existingReaction.users.includes(payload.username)) {
          existingReaction.users = existingReaction.users.filter(u => u !== payload.username);
          // Remove reaction if no users left
          if (existingReaction.users.length === 0) {
            message.reactions = message.reactions.filter(r => r.emoji !== payload.emoji);
          }
        } else {
          existingReaction.users.push(payload.username);
        }
      } else {
        // Add new reaction
        message.reactions.push({
          emoji: payload.emoji,
          users: [payload.username],
        });
      }
      
      // Broadcast updated message to all clients
      io.emit('message:reaction:update', {
        messageId: payload.messageId,
        reactions: message.reactions,
      });
    }
  });
  
  // Handle message edit
  socket.on('message:edit', (payload: EditMessagePayload) => {
    console.log('Edit message:', payload);
    const message = messages.get(payload.messageId);
    
    if (message && message.username === payload.username) {
      message.text = payload.newText;
      message.isEdited = true;
      
      // Broadcast updated message to all clients
      io.emit('message:edit:update', {
        messageId: payload.messageId,
        newText: payload.newText,
      });
    }
  });
  
  // Handle message delete
  socket.on('message:delete', (payload: DeleteMessagePayload) => {
    console.log('Delete message:', payload);
    const message = messages.get(payload.messageId);
    
    if (message && message.username === payload.username) {
      messages.delete(payload.messageId);
      
      // Broadcast deletion to all clients
      io.emit('message:delete:update', {
        messageId: payload.messageId,
      });
    }
  });
  
  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
