"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUsername } from "../context/UsernameContext";

// Function to generate a random guest username
const generateGuestName = (): string => {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `Guest${randomNum}`;
};

export default function WelcomePage() {
  const [inputUsername, setInputUsername] = useState("");
  const [error, setError] = useState("");
  const [isReturningUser, setIsReturningUser] = useState(false);
  const { username, setUsername, clearUsername } = useUsername();
  const router = useRouter();

  // Check if user is returning (has username in storage)
  useEffect(() => {
    if (username) {
      setIsReturningUser(true);
      setInputUsername(username);
    }
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate username
    const trimmedUsername = inputUsername.trim();
    
    if (trimmedUsername.length === 0) {
      // Generate default guest name
      const guestName = generateGuestName();
      setUsername(guestName);
      router.push("/chat");
    } else if (trimmedUsername.length < 2) {
      setError("Username must be at least 2 characters long");
      return;
    } else if (trimmedUsername.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    } else {
      setError("");
      setUsername(trimmedUsername);
      router.push("/chat");
    }
  };

  const handleUseGuestName = () => {
    const guestName = generateGuestName();
    setUsername(guestName);
    router.push("/chat");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputUsername(e.target.value);
    setError(""); // Clear error when user types
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            {isReturningUser ? 'Welcome Back!' : 'Welcome to Horizon Chat'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {isReturningUser ? 'Continue with your username or choose a new one' : 'Choose a username to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={inputUsername}
              onChange={handleInputChange}
              placeholder="Enter your username"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                error ? "border-red-500" : "border-gray-300"
              }`}
              maxLength={20}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Leave blank to use a guest name
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 transition-colors duration-200"
          >
            Enter Chat
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUseGuestName}
            className="w-full px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:ring-4 focus:ring-gray-300 transition-colors duration-200"
          >
            Continue as Guest
          </button>
          
          {isReturningUser && (
            <button
              type="button"
              onClick={() => {
                clearUsername();
                setInputUsername("");
                setIsReturningUser(false);
              }}
              className="w-full px-6 py-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
            >
              Start fresh with a new username
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
