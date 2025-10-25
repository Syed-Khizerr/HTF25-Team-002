// server/models/user.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
  },
  room: {
    type: String,
    required: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
module.exports.userSchema = userSchema;
