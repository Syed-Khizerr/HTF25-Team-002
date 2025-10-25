import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

interface User {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  googleLogin: (googleData: any) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = "http://localhost:5000/api/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Verify token with backend
  const verifyToken = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/verify`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(response.data.user);
      setToken(authToken);
    } catch (error) {
      console.error("Token verification failed:", error);
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      const { token: authToken, user: userData } = response.data;
      localStorage.setItem("token", authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      const message = error.response?.data?.error || "Login failed";
      throw new Error(message);
    }
  };

  // Signup function
  const signup = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
        displayName,
      });
      const { token: authToken, user: userData } = response.data;
      localStorage.setItem("token", authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      const message = error.response?.data?.error || "Signup failed";
      throw new Error(message);
    }
  };

  // Google login function
  const googleLogin = async (googleData: any) => {
    try {
      const response = await axios.post(`${API_URL}/google`, googleData);
      const { token: authToken, user: userData } = response.data;
      localStorage.setItem("token", authToken);
      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      const message = error.response?.data?.error || "Google login failed";
      throw new Error(message);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  // Update profile function
  const updateProfile = async (displayName: string) => {
    try {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await axios.put(
        `${API_URL}/profile`,
        { displayName },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUser(response.data.user);
    } catch (error: any) {
      const message = error.response?.data?.error || "Profile update failed";
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        googleLogin,
        updateProfile,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
