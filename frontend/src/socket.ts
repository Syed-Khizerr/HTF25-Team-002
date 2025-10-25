import { io, Socket } from "socket.io-client";

// Define the type for your socket (optional, but helps with autocomplete)
export const socket: Socket = io("http://localhost:5000");
