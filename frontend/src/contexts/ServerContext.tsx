import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

interface Server {
  _id: string;
  name: string;
  icon: string;
  ownerId: string;
  members: Array<{
    userId: string;
    username: string;
    joinedAt: string;
  }>;
  inviteCode: string;
  createdAt: string;
}

interface Channel {
  _id: string;
  name: string;
  serverId: string;
  createdAt: string;
}

interface ServerContextType {
  servers: Server[];
  currentServer: Server | null;
  channels: Channel[];
  loading: boolean;
  setCurrentServer: (server: Server | null) => void;
  createServer: (name: string, icon?: string) => Promise<void>;
  joinServer: (inviteCode: string) => Promise<void>;
  leaveServer: (serverId: string) => Promise<void>;
  updateServerIcon: (serverId: string, icon: string) => Promise<void>;
  fetchServers: () => Promise<void>;
  fetchChannels: (serverId: string) => Promise<void>;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

const API_URL = "http://localhost:5000/api/servers";

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [currentServer, setCurrentServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` },
  });

  const fetchServers = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await axios.get(API_URL, getAuthHeaders());
      setServers(response.data);

      // Auto-select first server if none selected
      if (response.data.length > 0 && !currentServer) {
        setCurrentServer(response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch servers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (serverId: string) => {
    if (!token) return;

    try {
      const response = await axios.get(
        `${API_URL}/${serverId}/channels`,
        getAuthHeaders()
      );
      setChannels(response.data);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  };

  const createServer = async (name: string, icon?: string) => {
    if (!token) return;

    try {
      const response = await axios.post(
        API_URL,
        { name, icon },
        getAuthHeaders()
      );
      const newServer = response.data.server;
      setServers([...servers, newServer]);
      setCurrentServer(newServer);
      await fetchChannels(newServer._id);
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to create server";
      throw new Error(message);
    }
  };

  const joinServer = async (inviteCode: string) => {
    if (!token) return;

    try {
      const response = await axios.post(
        `${API_URL}/join`,
        { inviteCode },
        getAuthHeaders()
      );
      const joinedServer = response.data.server;
      setServers([...servers, joinedServer]);
      setCurrentServer(joinedServer);
      await fetchChannels(joinedServer._id);
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to join server";
      throw new Error(message);
    }
  };

  const leaveServer = async (serverId: string) => {
    if (!token) return;

    try {
      await axios.delete(`${API_URL}/${serverId}/leave`, getAuthHeaders());
      const updatedServers = servers.filter((s) => s._id !== serverId);
      setServers(updatedServers);

      if (currentServer?._id === serverId) {
        setCurrentServer(updatedServers[0] || null);
        setChannels([]);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to leave server";
      throw new Error(message);
    }
  };

  const updateServerIcon = async (serverId: string, icon: string) => {
    if (!token) return;

    try {
      const response = await axios.put(
        `${API_URL}/${serverId}/icon`,
        { icon },
        getAuthHeaders()
      );

      // Update local state
      const updatedServers = servers.map((s) =>
        s._id === serverId ? response.data.server : s
      );
      setServers(updatedServers);

      // Update currentServer if it's the one being updated
      if (currentServer?._id === serverId) {
        setCurrentServer(response.data.server);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error || "Failed to update server icon";
      throw new Error(message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchServers();
    }
  }, [token]);

  useEffect(() => {
    if (currentServer) {
      fetchChannels(currentServer._id);
    }
  }, [currentServer]);

  return (
    <ServerContext.Provider
      value={{
        servers,
        currentServer,
        channels,
        loading,
        setCurrentServer,
        createServer,
        joinServer,
        leaveServer,
        updateServerIcon,
        fetchServers,
        fetchChannels,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error("useServer must be used within a ServerProvider");
  }
  return context;
}
