const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const webPush = require("web-push");

dotenv.config();

// Setup web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log("✅ Web Push configured with VAPID keys");
} else {
  console.warn(
    "⚠️  VAPID keys not found. Browser push notifications will not work. Run: npx web-push generate-vapid-keys"
  );
}

// models live in ../models (one level above server/)
const Message = require("../models/Message"); // see schema below
const Room = require("../models/Room");
const User = require("../models/User");
const RServer = require("../models/Server");

// Import routes and middleware
const authRoutes = require("./auth");
const serverRoutes = require("./servers");
const uploadRoutes = require("./upload");
const notificationRoutes = require("./notifications");
const authMiddleware = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Auth routes (public)
app.use("/api/auth", authRoutes);

// Server routes (protected)
app.use("/api/servers", authMiddleware, serverRoutes);

// Upload routes (protected)
app.use("/api", authMiddleware, uploadRoutes);

// Notification routes (protected)
app.use("/api/notifications", authMiddleware, notificationRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// MongoDB - use Atlas connection string in env
const MONGO =
  process.env.MONGODB ||
  process.env.MONGO ||
  "mongodb://localhost:27017/studyroom";

// Mongoose configuration
mongoose.set("strictQuery", false);
// Enable buffering with longer timeout
mongoose.set("bufferTimeoutMS", 30000);

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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      minPoolSize: 5,
      waitQueueTimeoutMS: 10000,
    });

    console.log("✅ MongoDB connected successfully");

    // Wait for connection to stabilize and pool to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("⏱️ Connection pool established");

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

      // Create default rooms if none exist using native driver
      const db = mongoose.connection.db;
      const roomsCollection = db.collection("rooms");
      const roomCount = await roomsCollection.countDocuments();
      console.log(`Found ${roomCount} rooms in database`);

      if (roomCount === 0) {
        console.log("🏗️ Creating default rooms...");
        await roomsCollection.insertMany([
          { name: "general", createdAt: new Date(), updatedAt: new Date() },
          { name: "math", createdAt: new Date(), updatedAt: new Date() },
          { name: "physics", createdAt: new Date(), updatedAt: new Date() },
        ]);
        console.log("✅ Default rooms created");
      } else {
        console.log("✅ Rooms already exist, skipping creation");
      }
    } catch (pingErr) {
      console.error("⚠️ Database initialization failed:", pingErr.message);
      console.log("💡 Continuing anyway - database operations may work later");
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
    const { serverId } = req.query; // Get serverId from query params

    if (!serverId) {
      return res.status(400).json({ error: "serverId is required" });
    }

    // Use native driver to avoid buffering issues
    const db = mongoose.connection.db;
    const { ObjectId } = require("mongodb");
    const messages = await db
      .collection("messages")
      .find({ room, serverId: new ObjectId(serverId) })
      .sort({ createdAt: 1 })
      .limit(200)
      .toArray();
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/rooms", async (req, res) => {
  try {
    // Use native driver to avoid buffering issues
    const db = mongoose.connection.db;
    const rooms = await db.collection("rooms").find({}).toArray();
    res.json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Socket.IO logic
const online = {}; // { serverId: { room: { socketId: username } } }

// Helper function to check DB connection
function isDbConnected() {
  return mongoose.connection.readyState === 1; // 1 = connected
}

// Helper function to get all unique users in a server (across all rooms)
function getAllServerUsers(serverId) {
  if (!online[serverId]) {
    return [];
  }

  const userMap = new Map();

  // Iterate through all rooms in the server
  Object.values(online[serverId]).forEach((room) => {
    Object.entries(room).forEach(([socketId, user]) => {
      // Use username as key to deduplicate users across rooms
      userMap.set(user.username, user);
    });
  });

  return Array.from(userMap.values());
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(
    "joinServer",
    ({ serverId, username, userId, displayName, avatar }) => {
      socket.serverId = serverId;
      socket.username = username;
      socket.userId = userId;
      socket.displayName = displayName || username;
      socket.avatar = avatar;
      socket.join(`server-${serverId}`);

      // Initialize server presence tracking
      if (!online[serverId]) {
        online[serverId] = {};
      }
    }
  );

  socket.on(
    "joinRoom",
    async ({ room, username, serverId, displayName, avatar }) => {
      // Create server-scoped room name to prevent cross-server messaging
      const scopedRoom = `${serverId}:${room}`;
      socket.join(scopedRoom);
      socket.currentRoom = room;
      socket.currentServerId = serverId;

      // Server-scoped presence tracking
      if (!serverId) {
        console.warn("No serverId provided for joinRoom");
        return;
      }

      if (!online[serverId]) {
        online[serverId] = {};
      }
      if (!online[serverId][room]) {
        online[serverId][room] = {};
      }

      // Check if user is already in another room (switching channels vs new login)
      const wasAlreadyOnline = Object.values(online[serverId]).some(
        (roomUsers) => roomUsers[socket.id]
      );

      // Store full user info in presence
      online[serverId][room][socket.id] = {
        username,
        displayName: displayName || username,
        avatar: avatar || null,
      };

      // Only emit presence if user wasn't already online (new login, not channel switch)
      if (!wasAlreadyOnline) {
        io.to(`server-${serverId}`).emit("presence", {
          room,
          users: getAllServerUsers(serverId),
        });
      }

      // safely load last messages
      if (!isDbConnected()) {
        console.warn("⚠️ DB not connected, sending empty message list");
        socket.emit("loadMessages", []);
        return;
      }

      try {
        // Use native driver to avoid buffering issues
        const db = mongoose.connection.db;
        const { ObjectId } = require("mongodb");
        const messages = await db
          .collection("messages")
          .find({ room, serverId: new ObjectId(serverId) })
          .sort({ createdAt: 1 })
          .limit(200)
          .toArray();

        // Populate replyTo messages
        for (const msg of messages) {
          if (msg.replyTo) {
            const parentMsg = await db
              .collection("messages")
              .findOne({ _id: new ObjectId(msg.replyTo) });
            if (parentMsg) {
              msg.replyToMessage = {
                _id: parentMsg._id,
                username: parentMsg.username,
                displayName: parentMsg.displayName,
                text: parentMsg.text,
                avatar: parentMsg.avatar,
              };
            }
          }
        }

        socket.emit("loadMessages", messages);
      } catch (err) {
        console.error("Error loading messages for room", room, err.message);
        socket.emit("loadMessages", []);
      }
    }
  );

  // Update presence when user profile changes
  socket.on(
    "updatePresence",
    ({ room, username, serverId, displayName, avatar }) => {
      if (!serverId || !room) {
        console.warn("No serverId or room provided for updatePresence");
        return;
      }

      // Update user info in presence
      if (!online[serverId]) {
        online[serverId] = {};
      }
      if (!online[serverId][room]) {
        online[serverId][room] = {};
      }

      // Update the presence data for this socket
      online[serverId][room][socket.id] = {
        username,
        displayName: displayName || username,
        avatar: avatar || null,
      };

      // Emit updated presence with all users in the server
      io.to(`server-${serverId}`).emit("presence", {
        room,
        users: getAllServerUsers(serverId),
      });
    }
  );

  socket.on(
    "sendMessage",
    async ({
      room,
      username,
      text,
      serverId,
      displayName,
      avatar,
      replyTo,
      attachments,
    }) => {
      if (!isDbConnected()) {
        console.warn("⚠️ DB not connected, cannot save message");
        socket.emit("messageError", { error: "Database connection lost" });
        return;
      }

      if (!serverId) {
        console.warn("No serverId provided for sendMessage");
        socket.emit("messageError", { error: "serverId is required" });
        return;
      }

      try {
        // Use native driver to avoid buffering issues
        const db = mongoose.connection.db;
        const { ObjectId } = require("mongodb");

        // Extract mentions from text (format: @username)
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }

        const msg = {
          room,
          username,
          displayName: displayName || username,
          avatar: avatar || null,
          text,
          serverId: new ObjectId(serverId),
          mentions: [...new Set(mentions)], // Remove duplicates
          replyTo: replyTo ? new ObjectId(replyTo) : null,
          attachments: attachments || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          reactions: {},
        };
        const result = await db.collection("messages").insertOne(msg);
        msg._id = result.insertedId;

        // If this is a reply, fetch the parent message
        if (replyTo) {
          const parentMsg = await db
            .collection("messages")
            .findOne({ _id: new ObjectId(replyTo) });
          if (parentMsg) {
            msg.replyToMessage = {
              _id: parentMsg._id,
              username: parentMsg.username,
              displayName: parentMsg.displayName,
              text: parentMsg.text,
              avatar: parentMsg.avatar,
            };
          }
        }

        // Emit only to users in this specific server-scoped room
        const scopedRoom = `${serverId}:${room}`;
        io.to(scopedRoom).emit("newMessage", msg);

        // Track mentions for notifications
        if (mentions.length > 0) {
          try {
            // Get server info for notification
            const server = await db
              .collection("servers")
              .findOne({ _id: new ObjectId(serverId) });

            for (const mentionedUsername of mentions) {
              // Don't notify if user mentioned themselves
              if (mentionedUsername === username) continue;

              // Use native driver with timeout for faster queries
              const mentionedUser = await db.collection("users").findOne(
                { username: mentionedUsername },
                { maxTimeMS: 2000 } // 2 second timeout
              );

              if (mentionedUser) {
                // Check notification settings
                const notificationSettings =
                  mentionedUser.notificationSettings || {};
                const serverSettings =
                  notificationSettings[serverId.toString()];
                const notificationsEnabled =
                  !serverSettings || serverSettings.enabled !== false;
                const channelMuted =
                  serverSettings?.mutedChannels?.includes(room);

                if (notificationsEnabled && !channelMuted) {
                  // Prepare mention data
                  const key = `${serverId}_${room}`;
                  const newMention = {
                    serverId: serverId.toString(),
                    serverName: server?.name || "Unknown Server",
                    channelId: room,
                    channelName: room,
                    messageId: msg._id.toString(),
                    timestamp: new Date(),
                  };

                  // Use atomic update with native driver for better performance
                  await db.collection("users").updateOne(
                    { _id: mentionedUser._id },
                    {
                      $push: { [`unreadMentions.${key}`]: newMention },
                    },
                    { maxTimeMS: 2000 }
                  );

                  // Emit notification to the mentioned user if they're online
                  io.to(`server-${serverId}`).emit("newMention", {
                    username: mentionedUsername,
                    serverId: serverId.toString(),
                    channelId: room,
                    messageId: msg._id.toString(),
                  });

                  // Send browser push notification if subscription exists
                  if (mentionedUser.pushSubscription) {
                    try {
                      const webpush = require("web-push");

                      // You'll need to set VAPID keys in .env
                      if (
                        process.env.VAPID_PUBLIC_KEY &&
                        process.env.VAPID_PRIVATE_KEY
                      ) {
                        webpush.setVapidDetails(
                          "mailto:your-email@example.com",
                          process.env.VAPID_PUBLIC_KEY,
                          process.env.VAPID_PRIVATE_KEY
                        );

                        const payload = JSON.stringify({
                          title: `${displayName || username} mentioned you`,
                          body: text.substring(0, 100),
                          icon: avatar || "/default-avatar.png",
                          badge: "/badge.png",
                          data: {
                            url: `/server/${serverId}/channel/${room}`,
                            serverId: serverId.toString(),
                            channelId: room,
                            messageId: msg._id.toString(),
                          },
                        });

                        await webPush.sendNotification(
                          mentionedUser.pushSubscription,
                          payload
                        );
                      }
                    } catch (pushError) {
                      console.error(
                        "Error sending push notification:",
                        pushError
                      );
                      // If subscription is invalid, remove it
                      if (pushError.statusCode === 410) {
                        mentionedUser.pushSubscription = null;
                        await mentionedUser.save();
                      }
                    }
                  }
                }
              }
            }
          } catch (mentionErr) {
            console.error("Error tracking mentions:", mentionErr);
          }
        }
      } catch (err) {
        console.error("Error saving message", err.message);
        socket.emit("messageError", { error: "Failed to save message" });
      }
    }
  );

  socket.on(
    "reactMessage",
    async ({ messageId, emoji, username, room, serverId }) => {
      if (!isDbConnected()) return;
      try {
        const db = mongoose.connection.db;
        const { ObjectId } = require("mongodb");
        const msg = await db
          .collection("messages")
          .findOne({ _id: new ObjectId(messageId) });
        if (!msg) return;

        // reactions format: { emoji: [usernames] }
        msg.reactions = msg.reactions || {};
        if (!msg.reactions[emoji]) {
          msg.reactions[emoji] = [];
        }

        // Toggle reaction - if user already reacted, remove it; otherwise add it
        const userIndex = msg.reactions[emoji].indexOf(username);
        if (userIndex > -1) {
          msg.reactions[emoji].splice(userIndex, 1);
          // Remove emoji key if no users left
          if (msg.reactions[emoji].length === 0) {
            delete msg.reactions[emoji];
          }
        } else {
          msg.reactions[emoji].push(username);
        }

        await db
          .collection("messages")
          .updateOne(
            { _id: new ObjectId(messageId) },
            { $set: { reactions: msg.reactions, updatedAt: new Date() } }
          );
        const scopedRoom = serverId ? `${serverId}:${room}` : room;
        io.to(scopedRoom).emit("updateMessage", msg);
      } catch (err) {
        console.error("Error reacting to message:", err.message);
      }
    }
  );

  socket.on("pinMessage", async ({ messageId, room, serverId }) => {
    if (!isDbConnected()) return;
    try {
      const db = mongoose.connection.db;
      const { ObjectId } = require("mongodb");

      // Get current message to toggle pinned state
      const currentMsg = await db
        .collection("messages")
        .findOne({ _id: new ObjectId(messageId) });

      const newPinnedState = !currentMsg?.pinned;

      await db
        .collection("messages")
        .updateOne(
          { _id: new ObjectId(messageId) },
          { $set: { pinned: newPinnedState, updatedAt: new Date() } }
        );
      const msg = await db
        .collection("messages")
        .findOne({ _id: new ObjectId(messageId) });
      const scopedRoom = serverId ? `${serverId}:${room}` : room;
      io.to(scopedRoom).emit("updateMessage", msg);
    } catch (err) {
      console.error("Error pinning message:", err.message);
    }
  });

  socket.on(
    "deleteMessage",
    async ({ messageId, room, serverId, username }) => {
      if (!isDbConnected()) return;
      try {
        const db = mongoose.connection.db;
        const { ObjectId } = require("mongodb");

        // Check if message exists and user owns it
        const message = await db
          .collection("messages")
          .findOne({ _id: new ObjectId(messageId) });

        if (!message) {
          socket.emit("messageError", { error: "Message not found" });
          return;
        }

        // Only allow user to delete their own messages
        if (message.username !== username) {
          socket.emit("messageError", {
            error: "You can only delete your own messages",
          });
          return;
        }

        await db
          .collection("messages")
          .deleteOne({ _id: new ObjectId(messageId) });
        const scopedRoom = serverId ? `${serverId}:${room}` : room;
        io.to(scopedRoom).emit("deletedMessage", { messageId });
      } catch (err) {
        console.error("Error deleting message:", err.message);
      }
    }
  );

  socket.on("leaveRoom", ({ room, serverId }) => {
    const scopedRoom = serverId ? `${serverId}:${room}` : room;
    socket.leave(scopedRoom);

    if (serverId && online[serverId] && online[serverId][room]) {
      delete online[serverId][room][socket.id];

      // Check if user is still in another room (switching channels)
      const stillInServer = Object.values(online[serverId]).some(
        (roomUsers) => roomUsers[socket.id]
      );

      // Only emit presence if user is not in any other room (leaving server, not switching)
      if (!stillInServer) {
        io.to(`server-${serverId}`).emit("presence", {
          room,
          users: getAllServerUsers(serverId),
        });
      }
    }
  });

  socket.on("disconnect", () => {
    const serverId = socket.serverId;
    const currentRoom = socket.currentRoom;

    // Remove from server presence tracking
    if (serverId && online[serverId]) {
      for (const room of Object.keys(online[serverId])) {
        if (online[serverId][room][socket.id]) {
          delete online[serverId][room][socket.id];
          io.to(`server-${serverId}`).emit("presence", {
            room,
            users: getAllServerUsers(serverId),
          });
        }
      }
    }
    console.log("socket disconnected", socket.id);
  });
});

// Start the server
startServer();
