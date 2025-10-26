import { io, Socket } from "socket.io-client";

// Use environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Define the type for your socket (optional, but helps with autocomplete)
export const socket: Socket = io(API_URL);
