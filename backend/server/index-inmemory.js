const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// In-memory storage (no MongoDB needed)
const messages = {}; // { roomName: [messages] }
const rooms = [
  { name: "general", createdAt: new Date() },
  { name: "math", createdAt: new Date() },
  { name: "physics", createdAt: new Date() },
];
const online = {}; // { room: { socketId: username } }

console.log("✅ Using in-memory storage (no MongoDB required)");
console.log("📦 Default rooms:", rooms.map((r) => r.name).join(", "));

// REST endpoints
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: "in-memory",
    timestamp: new Date().toISOString(),
  });
});

app.get("/rooms/:room/messages", async (req, res) => {
  try {
    const { room } = req.params;
    const roomMessages = messages[room] || [];
    res.json(roomMessages.slice(-200)); // Last 200 messages
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/rooms", async (req, res) => {
  try {
    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("joinRoom", ({ room, username }) => {
    socket.join(room);

    // Add to presence
    online[room] = online[room] || {};
    online[room][socket.id] = username;
    io.to(room).emit("presence", Object.values(online[room]));

    // Send existing messages
    const roomMessages = messages[room] || [];
    socket.emit("loadMessages", roomMessages.slice(-200));

    console.log(`User ${username} joined room ${room}`);
  });

  socket.on("sendMessage", ({ room, username, text }) => {
    try {
      const msg = {
        _id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        room,
        username,
        text,
        createdAt: new Date().toISOString(),
        reactions: {},
        pinned: false,
      };

      // Store message
      messages[room] = messages[room] || [];
      messages[room].push(msg);

      // Broadcast to room
      io.to(room).emit("newMessage", msg);
      console.log(
        `Message in ${room} from ${username}: ${text.substring(0, 50)}...`
      );
    } catch (err) {
      console.error("Error saving message:", err);
      socket.emit("messageError", { error: "Failed to save message" });
    }
  });

  socket.on("reactMessage", ({ messageId, reaction, username, room }) => {
    try {
      const roomMessages = messages[room] || [];
      const msg = roomMessages.find((m) => m._id === messageId);

      if (msg) {
        msg.reactions = msg.reactions || {};
        msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
        io.to(room).emit("updateMessage", msg);
      }
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  });

  socket.on("pinMessage", ({ messageId, room }) => {
    try {
      const roomMessages = messages[room] || [];
      const msg = roomMessages.find((m) => m._id === messageId);

      if (msg) {
        msg.pinned = true;
        io.to(room).emit("updateMessage", msg);
      }
    } catch (err) {
      console.error("Error pinning message:", err);
    }
  });

  socket.on("deleteMessage", ({ messageId, room }) => {
    try {
      messages[room] = (messages[room] || []).filter(
        (m) => m._id !== messageId
      );
      io.to(room).emit("deletedMessage", { messageId });
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  });

  socket.on("leaveRoom", ({ room }) => {
    socket.leave(room);
    if (online[room]) delete online[room][socket.id];
    io.to(room).emit(
      "presence",
      online[room] ? Object.values(online[room]) : []
    );
  });

  socket.on("disconnect", () => {
    // Remove from all rooms
    for (const room of Object.keys(online)) {
      if (online[room][socket.id]) {
        delete online[room][socket.id];
        io.to(room).emit("presence", Object.values(online[room]));
      }
    }
    console.log("socket disconnected", socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend should connect to http://localhost:${PORT}`);
  console.log(`⚡ Using in-memory storage - messages will be lost on restart`);
});
