"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface UsernameContextType {
  username: string | null;
  setUsername: (name: string) => void;
  clearUsername: () => void;
}

const UsernameContext = createContext<UsernameContextType | undefined>(undefined);

export const UsernameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string | null>(null);

  // Load username from localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("chatUsername");
    if (savedUsername) {
      setUsernameState(savedUsername);
    }
  }, []);

  const setUsername = (name: string) => {
    setUsernameState(name);
    localStorage.setItem("chatUsername", name);
  };

  const clearUsername = () => {
    setUsernameState(null);
    localStorage.removeItem("chatUsername");
  };

  return (
    <UsernameContext.Provider value={{ username, setUsername, clearUsername }}>
      {children}
    </UsernameContext.Provider>
  );
};

export const useUsername = () => {
  const context = useContext(UsernameContext);
  if (context === undefined) {
    throw new Error("useUsername must be used within a UsernameProvider");
  }
  return context;
};
