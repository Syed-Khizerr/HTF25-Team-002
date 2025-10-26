// server/models/user.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  displayName: {
    type: String,
    trim: true,
    // Optional - users can set their own display name
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for Google users
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    // Not required because Google users won't have a password
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for non-Google users
  },
  avatar: {
    type: String, // URL for Google profile picture
  },
  // Notification settings per server (simplified - not using Map)
  notificationSettings: {
    type: Object,
    default: {},
  },
  // Unread mentions tracking (simplified - not using Map)
  unreadMentions: {
    type: Object,
    default: {},
  },
  // Browser push notification subscription
  pushSubscription: {
    type: Object,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
