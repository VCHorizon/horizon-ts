"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUsername } from "../context/UsernameContext";
import { io, Socket } from "socket.io-client";

interface Message {
  username: string;
  text: string;
  timestamp: string;
}

export default function ChatPage() {
  const { username, clearUsername } = useUsername();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Redirect to welcome if no username
  useEffect(() => {
    if (!username) {
      router.push("/welcome");
      return;
    }
  }, [username, router]);

  // WebSocket connection
  useEffect(() => {
    if (!username) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      // Notify server that user joined
      socket.emit('user:joined', { username });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
    });

    socket.on('reconnect_attempt', () => {
      console.log('Attempting to reconnect...');
    });

    socket.on('reconnect', () => {
      console.log('Reconnected successfully');
      setIsConnected(true);
      socket.emit('user:joined', { username });
    });

    socket.on('chat:message', (msg: Message) => {
      setMessages((prev) => [...prev, {
        ...msg,
        timestamp: msg.timestamp
      }]);
    });

    socket.on('user:joined', (data: { username: string; timestamp: string }) => {
      // Add system message when user joins
      setMessages((prev) => [...prev, {
        username: 'System',
        text: `${data.username} joined the chat`,
        timestamp: data.timestamp
      }]);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [username]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && username && socketRef.current?.connected) {
      const chatMessage: Message = {
        username,
        text: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      socketRef.current.emit('chat:message', chatMessage);
      setMessage("");
    }
  };

  const handleLogout = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    clearUsername();
    router.push("/welcome");
  };

  if (!username) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-indigo-600 dark:bg-indigo-800 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Horizon Chat</h1>
            <p className="text-sm text-indigo-200">
              Logged in as: {username}
              <span className={`ml-3 inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className="ml-1 text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors duration-200"
          >
            Change Username
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {!isConnected && (
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded mb-4">
              <p className="font-semibold">⚠️ Not connected to chat server</p>
              <p className="text-sm">Make sure the WebSocket server is running with: <code className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">npm run dev:server</code></p>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p className="text-lg">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.username === username ? "justify-end" : msg.username === 'System' ? "justify-center" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.username === 'System'
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm italic"
                      : msg.username === username
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  }`}
                >
                  {msg.username !== 'System' && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {msg.username}
                    </p>
                  )}
                  <p className="break-words">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={500}
              disabled={!isConnected}
            />
            <button
              type="submit"
              disabled={!message.trim() || !isConnected}
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
