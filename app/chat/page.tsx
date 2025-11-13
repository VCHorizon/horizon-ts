"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUsername } from "../context/UsernameContext";

export default function ChatPage() {
  const { username, clearUsername } = useUsername();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ username: string; text: string; timestamp: Date }>>([]);

  // Redirect to welcome if no username
  useEffect(() => {
    if (!username) {
      router.push("/welcome");
    }
  }, [username, router]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && username) {
      setMessages([...messages, {
        username,
        text: message.trim(),
        timestamp: new Date()
      }]);
      setMessage("");
    }
  };

  const handleLogout = () => {
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
            <p className="text-sm text-indigo-200">Logged in as: {username}</p>
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
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <p className="text-lg">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.username === username ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.username === username
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 opacity-75">
                    {msg.username}
                  </p>
                  <p className="break-words">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
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
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!message.trim()}
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
