const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const router = express.Router();

// Helper function to get database
const getDb = () => mongoose.connection.db;

// Generate random invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// Get all servers for a user
router.get("/", async (req, res) => {
  try {
    const userId = req.userId; // Set by auth middleware

    const db = getDb();
    const serversCollection = db.collection("servers");

    const servers = await serversCollection
      .find({
        "members.userId": new ObjectId(userId),
      })
      .toArray();

    res.json(servers);
  } catch (error) {
    console.error("Error fetching servers:", error);
    res.status(500).json({ error: "Failed to fetch servers" });
  }
});

// Create a new server
router.post("/", async (req, res) => {
  try {
    const { name, icon } = req.body;
    const userId = req.userId;
    const username = req.username;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Server name is required" });
    }

    const db = getDb();
    const serversCollection = db.collection("servers");
    const roomsCollection = db.collection("rooms");

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    while (await serversCollection.findOne({ inviteCode })) {
      inviteCode = generateInviteCode();
    }

    // Create server
    const newServer = {
      name: name.trim(),
      icon: icon || "📚",
      ownerId: new ObjectId(userId),
      members: [
        {
          userId: new ObjectId(userId),
          username: username,
          joinedAt: new Date(),
        },
      ],
      inviteCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const serverResult = await serversCollection.insertOne(newServer);
    const serverId = serverResult.insertedId;

    // Create default channels
    const defaultChannels = [
      { name: "general", serverId },
      { name: "study-room", serverId },
      { name: "homework-help", serverId },
    ];

    await roomsCollection.insertMany(
      defaultChannels.map((channel) => ({
        ...channel,
        serverId,
        createdAt: new Date(),
      }))
    );

    newServer._id = serverId;

    res.status(201).json({
      message: "Server created successfully",
      server: newServer,
    });
  } catch (error) {
    console.error("Error creating server:", error);
    res.status(500).json({ error: "Failed to create server" });
  }
});

// Join a server by invite code
router.post("/join", async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.userId;
    const username = req.username;

    if (!inviteCode) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const db = getDb();
    const serversCollection = db.collection("servers");

    const server = await serversCollection.findOne({
      inviteCode: inviteCode.toUpperCase(),
    });

    if (!server) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    // Check if user is already a member
    const isMember = server.members.some(
      (member) => member.userId.toString() === userId
    );

    if (isMember) {
      return res
        .status(400)
        .json({ error: "You are already a member of this server" });
    }

    // Add user to server
    await serversCollection.updateOne(
      { _id: server._id },
      {
        $push: {
          members: {
            userId: new ObjectId(userId),
            username: username,
            joinedAt: new Date(),
          },
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    // Fetch updated server
    const updatedServer = await serversCollection.findOne({ _id: server._id });

    res.json({
      message: "Joined server successfully",
      server: updatedServer,
    });
  } catch (error) {
    console.error("Error joining server:", error);
    res.status(500).json({ error: "Failed to join server" });
  }
});

// Leave a server
router.delete("/:serverId/leave", async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;

    const db = getDb();
    const serversCollection = db.collection("servers");

    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Check if user is the owner
    if (server.ownerId.toString() === userId) {
      return res.status(400).json({
        error:
          "Server owner cannot leave. Transfer ownership or delete the server.",
      });
    }

    // Remove user from server
    await serversCollection.updateOne(
      { _id: new ObjectId(serverId) },
      {
        $pull: {
          members: { userId: new ObjectId(userId) },
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    res.json({ message: "Left server successfully" });
  } catch (error) {
    console.error("Error leaving server:", error);
    res.status(500).json({ error: "Failed to leave server" });
  }
});

// Get channels for a server
router.get("/:serverId/channels", async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;

    const db = getDb();
    const serversCollection = db.collection("servers");
    const roomsCollection = db.collection("rooms");

    // Verify user is a member of the server
    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
      "members.userId": new ObjectId(userId),
    });

    if (!server) {
      return res
        .status(403)
        .json({ error: "You are not a member of this server" });
    }

    // Get channels for this server
    const channels = await roomsCollection
      .find({ serverId: new ObjectId(serverId) })
      .toArray();

    res.json(channels);
  } catch (error) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// Update server icon
router.put("/:serverId/icon", async (req, res) => {
  try {
    const { serverId } = req.params;
    const { icon } = req.body;
    const userId = req.userId;

    if (!icon) {
      return res.status(400).json({ error: "Icon is required" });
    }

    const db = getDb();
    const serversCollection = db.collection("servers");

    // Find the server and check if user is owner
    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Check if user is owner
    if (server.ownerId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "Only the server owner can change the icon" });
    }

    // Update server icon
    await serversCollection.updateOne(
      { _id: new ObjectId(serverId) },
      {
        $set: {
          icon: icon,
          updatedAt: new Date(),
        },
      }
    );

    // Fetch updated server
    const updatedServer = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    res.json({
      message: "Server icon updated successfully",
      server: updatedServer,
    });
  } catch (error) {
    console.error("Error updating server icon:", error);
    res.status(500).json({ error: "Failed to update server icon" });
  }
});

// Get all members of a server
router.get("/:serverId/members", async (req, res) => {
  try {
    const { serverId } = req.params;
    const userId = req.userId;

    const db = getDb();
    const serversCollection = db.collection("servers");
    const usersCollection = db.collection("users");

    // Find the server
    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Check if user is a member
    const isMember = server.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this server" });
    }

    // Get user details for all members
    const memberUserIds = server.members.map((m) => m.userId);
    const users = await usersCollection
      .find({ _id: { $in: memberUserIds } })
      .project({ username: 1, displayName: 1, avatar: 1 })
      .toArray();

    // Map to user details
    const members = users.map((user) => ({
      username: user.username,
      displayName: user.displayName || user.username,
      avatar: user.avatar || null,
    }));

    res.json(members);
  } catch (error) {
    console.error("Error fetching server members:", error);
    res.status(500).json({ error: "Failed to fetch server members" });
  }
});

// Create a new channel in a server
router.post("/:serverId/channels", async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    // Validate channel name (alphanumeric and hyphens only)
    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!/^[a-z0-9-]+$/.test(channelName)) {
      return res.status(400).json({
        error: "Channel name can only contain letters, numbers, and hyphens",
      });
    }

    const db = getDb();
    const serversCollection = db.collection("servers");
    const roomsCollection = db.collection("rooms");

    // Find the server and check if user is owner
    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Check if user is owner
    if (server.ownerId.toString() !== userId) {
      return res.status(403).json({
        error: "Only the server owner can create channels",
      });
    }

    // Check if channel already exists
    const existingChannel = await roomsCollection.findOne({
      serverId: new ObjectId(serverId),
      name: channelName,
    });

    if (existingChannel) {
      return res.status(400).json({
        error: "A channel with this name already exists",
      });
    }

    // Create new channel
    const newChannel = {
      name: channelName,
      serverId: new ObjectId(serverId),
      createdAt: new Date(),
    };

    const result = await roomsCollection.insertOne(newChannel);
    newChannel._id = result.insertedId;

    res.status(201).json({
      message: "Channel created successfully",
      channel: newChannel,
    });
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ error: "Failed to create channel" });
  }
});

// Delete a channel from a server
router.delete("/:serverId/channels/:channelId", async (req, res) => {
  try {
    const { serverId, channelId } = req.params;
    const userId = req.userId;

    const db = getDb();
    const serversCollection = db.collection("servers");
    const roomsCollection = db.collection("rooms");
    const messagesCollection = db.collection("messages");

    // Find the server and check if user is owner
    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Check if user is owner
    if (server.ownerId.toString() !== userId) {
      return res.status(403).json({
        error: "Only the server owner can delete channels",
      });
    }

    // Find the channel
    const channel = await roomsCollection.findOne({
      _id: new ObjectId(channelId),
      serverId: new ObjectId(serverId),
    });

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Prevent deleting the last channel
    const channelCount = await roomsCollection.countDocuments({
      serverId: new ObjectId(serverId),
    });

    if (channelCount <= 1) {
      return res.status(400).json({
        error: "Cannot delete the last channel in a server",
      });
    }

    // Delete the channel
    await roomsCollection.deleteOne({ _id: new ObjectId(channelId) });

    // Delete all messages in the channel
    await messagesCollection.deleteMany({
      room: channel.name,
      serverId: new ObjectId(serverId),
    });

    res.json({
      message: "Channel deleted successfully",
      channelId: channelId,
    });
  } catch (error) {
    console.error("Error deleting channel:", error);
    res.status(500).json({ error: "Failed to delete channel" });
  }
});

// Rename a channel in a server
router.put("/:serverId/channels/:channelId", async (req, res) => {
  try {
    const { serverId, channelId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    // Validate channel name (alphanumeric and hyphens only)
    const channelName = name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!/^[a-z0-9-]+$/.test(channelName)) {
      return res.status(400).json({
        error: "Channel name can only contain letters, numbers, and hyphens",
      });
    }

    const db = getDb();
    const serversCollection = db.collection("servers");
    const roomsCollection = db.collection("rooms");
    const messagesCollection = db.collection("messages");

    // Find the server and check if user is owner
    const server = await serversCollection.findOne({
      _id: new ObjectId(serverId),
    });

    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Check if user is owner
    if (server.ownerId.toString() !== userId) {
      return res.status(403).json({
        error: "Only the server owner can rename channels",
      });
    }

    // Find the channel
    const channel = await roomsCollection.findOne({
      _id: new ObjectId(channelId),
      serverId: new ObjectId(serverId),
    });

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    // Check if new name is the same as current name
    if (channel.name === channelName) {
      return res.status(400).json({
        error: "New name is the same as current name",
      });
    }

    // Check if channel with new name already exists
    const existingChannel = await roomsCollection.findOne({
      serverId: new ObjectId(serverId),
      name: channelName,
      _id: { $ne: new ObjectId(channelId) },
    });

    if (existingChannel) {
      return res.status(400).json({
        error: "A channel with this name already exists",
      });
    }

    const oldName = channel.name;

    // Update channel name
    await roomsCollection.updateOne(
      { _id: new ObjectId(channelId) },
      {
        $set: {
          name: channelName,
          updatedAt: new Date(),
        },
      }
    );

    // Update all messages in the channel to reflect the new room name
    await messagesCollection.updateMany(
      {
        room: oldName,
        serverId: new ObjectId(serverId),
      },
      {
        $set: {
          room: channelName,
        },
      }
    );

    res.json({
      message: "Channel renamed successfully",
      channel: {
        _id: channelId,
        name: channelName,
        oldName: oldName,
      },
    });
  } catch (error) {
    console.error("Error renaming channel:", error);
    res.status(500).json({ error: "Failed to rename channel" });
  }
});

module.exports = router;
