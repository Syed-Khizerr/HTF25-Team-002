const mongoose = require("mongoose");

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  icon: {
    type: String, // URL or emoji
    default: "📚", // Default emoji for study servers
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      username: String,
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  inviteCode: {
    type: String,
    unique: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const RServer = mongoose.model("Server", serverSchema);
module.exports = RServer;
