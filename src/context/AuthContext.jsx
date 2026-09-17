import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState({ id: 1, username: "TV User", role: "admin", preferences: {} });
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    const rawFavs = localStorage.getItem("bubbaflix_favorites");
    const rawTheme = localStorage.getItem("bubbaflix_theme") || "dark-red";
    setUser(prev => ({
      ...prev,
      preferences: {
        theme: rawTheme,
        favorites: rawFavs ? JSON.parse(rawFavs) : []
      }
    }));
  }, []);

  const login = async () => {};

  const logout = async () => {};
  
  const updatePreferences = async (newPrefs) => {
    setUser(prev => ({ ...prev, preferences: { ...prev.preferences, ...newPrefs } }));
  };

  return (
    <AuthContext.Provider value={{ user, token: "local", loading, setupRequired, setSetupRequired, login, logout, updatePreferences, setToken: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};
