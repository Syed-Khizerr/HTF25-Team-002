const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

// models live in ../models (one level above server/)
const Message = require("../models/Message"); // see schema below
const Room = require("../models/Room");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// MongoDB - use Atlas connection string in env
const MONGO =
  process.env.MONGODB ||
  process.env.MONGO ||
  "mongodb://localhost:27017/studyroom";

// Mongoose configuration
mongoose.set("strictQuery", false);
mongoose.set("bufferTimeoutMS", 30000); // Increase buffer timeout to 30 seconds

// Add connection event handlers
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose disconnected - attempting to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ Mongoose reconnected to MongoDB");
});

async function startServer() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    console.log(
      "Connection string:",
      MONGO.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
    ); // Hide password in logs

    await mongoose.connect(MONGO, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
      w: "majority",
      wtimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected successfully");

    // Verify we can actually query the database
    try {
      await mongoose.connection.db.admin().ping();
      console.log("✅ Database ping successful");

      // Initialize collections if they don't exist
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      console.log(
        `📦 Found ${collections.length} collections:`,
        collections.map((c) => c.name).join(", ")
      );

      // Create default rooms if none exist
      const roomCount = await Room.countDocuments();
      if (roomCount === 0) {
        console.log("🏗️ Creating default rooms...");
        await Room.create([
          { name: "general" },
          { name: "math" },
          { name: "physics" },
        ]);
        console.log("✅ Default rooms created");
      }
    } catch (pingErr) {
      console.error("⚠️ Database initialization failed:", pingErr.message);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    console.error("Please check:");
    console.error(
      "1. Your .env file has the correct MONGODB connection string"
    );
    console.error("2. Your IP address is whitelisted in MongoDB Atlas");
    console.error("3. Your MongoDB credentials are correct");
    process.exit(1);
  }
}

// REST endpoints (simple)
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: dbStatus === 1 ? "ok" : "error",
    database: statusMap[dbStatus] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

app.get("/rooms/:room/messages", async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await Message.find({ room })
      .sort({ createdAt: 1 })
      .limit(200);
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/rooms", async (req, res) => {
  try {
    const rooms = await Room.find({});
    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Socket.IO logic
const online = {}; // { room: { socketId: username } }

// Helper function to check DB connection
function isDbConnected() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("joinRoom", async ({ room, username }) => {
    socket.join(room);
    // add to presence
    online[room] = online[room] || {};
    online[room][socket.id] = username;
    io.to(room).emit("presence", Object.values(online[room]));

    // safely load last messages
    if (!isDbConnected()) {
      console.warn("⚠️ DB not connected, sending empty message list");
      socket.emit("loadMessages", []);
      return;
    }

    try {
      const last = await Message.find({ room })
        .sort({ createdAt: 1 })
        .limit(200)
        .maxTimeMS(5000); // 5 second timeout for query
      socket.emit("loadMessages", last);
    } catch (err) {
      console.error("Error loading messages for room", room, err.message);
      socket.emit("loadMessages", []);
    }
  });

  socket.on("sendMessage", async ({ room, username, text }) => {
    if (!isDbConnected()) {
      console.warn("⚠️ DB not connected, cannot save message");
      socket.emit("messageError", { error: "Database connection lost" });
      return;
    }

    try {
      const msg = new Message({ room, username, text });
      await msg.save();
      io.to(room).emit("newMessage", msg);
    } catch (err) {
      console.error("Error saving message", err.message);
      socket.emit("messageError", { error: "Failed to save message" });
    }
  });

  socket.on("reactMessage", async ({ messageId, reaction, username, room }) => {
    if (!isDbConnected()) return;
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.reactions = msg.reactions || {};
      msg.reactions[reaction] = (msg.reactions[reaction] || 0) + 1;
      await msg.save();
      io.to(room).emit("updateMessage", msg);
    } catch (err) {
      console.error("Error reacting to message:", err.message);
    }
  });

  socket.on("pinMessage", async ({ messageId, room }) => {
    if (!isDbConnected()) return;
    try {
      await Message.findByIdAndUpdate(messageId, { pinned: true });
      const msg = await Message.findById(messageId);
      io.to(room).emit("updateMessage", msg);
    } catch (err) {
      console.error("Error pinning message:", err.message);
    }
  });

  socket.on("deleteMessage", async ({ messageId, room }) => {
    if (!isDbConnected()) return;
    try {
      await Message.findByIdAndDelete(messageId);
      io.to(room).emit("deletedMessage", { messageId });
    } catch (err) {
      console.error("Error deleting message:", err.message);
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
    // remove from all rooms
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
startServer();
