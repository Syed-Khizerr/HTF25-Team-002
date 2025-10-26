const express = require("express");
const router = express.Router();
const User = require("../models/User");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

// Get notification settings for a server
router.get("/settings/:serverId", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.userId) }, { maxTimeMS: 2000 });

    if (!user) {
      return res.json({ enabled: true, mutedChannels: [] });
    }

    const notificationSettings = user.notificationSettings || {};
    const serverSettings = notificationSettings[req.params.serverId] || {
      enabled: true,
      mutedChannels: [],
    };

    res.json(serverSettings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    // Return defaults on error instead of 500
    res.json({ enabled: true, mutedChannels: [] });
  }
});

// Update notification settings for a server
router.put("/settings/:serverId", async (req, res) => {
  try {
    const { enabled, mutedChannels } = req.body;
    const db = mongoose.connection.db;

    const newSettings = {
      enabled: enabled !== undefined ? enabled : true,
      mutedChannels: mutedChannels || [],
    };

    // Use atomic update with native driver
    await db.collection("users").updateOne(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          [`notificationSettings.${req.params.serverId}`]: newSettings,
        },
      },
      { maxTimeMS: 2000 }
    );

    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.json({ success: true }); // Return success anyway
  }
});

// Get unread mentions
router.get("/mentions", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.userId) }, { maxTimeMS: 2000 });

    if (!user) {
      return res.json({});
    }

    const mentions = user.unreadMentions || {};
    res.json(mentions);
  } catch (error) {
    console.error("Error fetching mentions:", error);
    res.json({});
  }
});

// Mark mentions as read for a channel
router.delete("/mentions/:serverId/:channelId", async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const key = `${req.params.serverId}_${req.params.channelId}`;

    // Use atomic update to unset the mention key
    await db.collection("users").updateOne(
      { _id: new ObjectId(req.userId) },
      {
        $unset: { [`unreadMentions.${key}`]: "" },
      },
      { maxTimeMS: 2000 }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing mentions:", error);
    res.json({ success: true }); // Return success anyway
  }
});

// Save push subscription
router.post("/subscribe", async (req, res) => {
  try {
    const { subscription } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.pushSubscription = subscription;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
});

// Remove push subscription
router.delete("/subscribe", async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.pushSubscription = null;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    res.status(500).json({ error: "Failed to remove push subscription" });
  }
});

module.exports = router;
