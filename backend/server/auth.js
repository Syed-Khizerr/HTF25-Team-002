const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Helper function to get database
const getDb = () => mongoose.connection.db;

// Generate brain-rot style username without spaces
const generateBrainrotUsername = async (db) => {
  const adjectives = [
    "sigma",
    "alpha",
    "based",
    "chad",
    "gigachad",
    "beta",
    "omega",
    "skibidi",
    "rizz",
    "gyatt",
    "mewing",
    "mogging",
    "edging",
    "gooning",
    "bussin",
    "slay",
    "fire",
    "cap",
    "nocap",
    "lowkey",
    "highkey",
    "mid",
    "cringe",
    "based",
    "redpilled",
    "bluepilled",
    "blackpilled",
    "griddy",
    "fanum",
    "ohio",
  ];

  const nouns = [
    "warrior",
    "king",
    "lord",
    "master",
    "champion",
    "legend",
    "god",
    "titan",
    "hunter",
    "slayer",
    "destroyer",
    "conqueror",
    "phantom",
    "shadow",
    "demon",
    "angel",
    "knight",
    "prince",
    "duke",
    "emperor",
    "samurai",
    "ninja",
    "dragon",
    "wolf",
    "lion",
    "tiger",
    "eagle",
    "hawk",
    "viper",
    "reaper",
  ];

  let username;
  let attempts = 0;
  const maxAttempts = 50;
  const usersCollection = db.collection("users");

  do {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 9999);

    username = `${adj}${noun}${number}`;
    attempts++;

    // Check if username exists
    const existing = await usersCollection.findOne({ username });
    if (!existing) {
      return username;
    }
  } while (attempts < maxAttempts);

  // Fallback: use timestamp
  return `user${Date.now()}`;
};

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const db = getDb();
    const usersCollection = db.collection("users");

    // Check if email already exists
    const existingUser = await usersCollection.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate unique brain-rot username
    const username = await generateBrainrotUsername(db);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      username,
      displayName: displayName || username, // Use provided display name or default to username
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);
    const userId = result.insertedId;

    // Generate JWT token
    const token = jwt.sign(
      { userId: userId.toString(), username: username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: userId.toString(),
        username: username,
        displayName: newUser.displayName,
        email: email.toLowerCase(),
        avatar: null,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const db = getDb();
    const usersCollection = db.collection("users");

    // Find user by email
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if user has a password (not a Google user)
    if (!user.password) {
      return res.status(401).json({
        error:
          "This account was created with Google. Please sign in with Google.",
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Verify token route
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const db = getDb();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } } // Exclude password field
    );

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Google OAuth callback route
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res.status(400).json({ error: "Invalid Google user data" });
    }

    const db = getDb();
    const usersCollection = db.collection("users");

    // Check if user exists
    let user = await usersCollection.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // Update existing user
      const updateFields = { lastLogin: new Date() };
      if (!user.googleId) {
        updateFields.googleId = googleId;
      }
      if (!user.avatar && picture) {
        updateFields.avatar = picture;
      }

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateFields }
      );

      // Update local user object
      user = { ...user, ...updateFields };
    } else {
      // Create new user with auto-generated brain-rot username
      const username = await generateBrainrotUsername(db);

      const newUser = {
        username,
        displayName: name || username, // Use Google name as display name
        email: email.toLowerCase(),
        googleId,
        avatar: picture,
        createdAt: new Date(),
        lastLogin: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Google authentication successful",
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res
      .status(500)
      .json({ error: "Server error during Google authentication" });
  }
});

// Update user profile route (protected)
router.put("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { displayName } = req.body;

    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: "Display name cannot be empty" });
    }

    if (displayName.trim().length > 50) {
      return res.status(400).json({ error: "Display name is too long" });
    }

    const db = getDb();
    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { _id: new ObjectId(decoded.userId) },
      { $set: { displayName: displayName.trim() } }
    );

    const updatedUser = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id.toString(),
        username: updatedUser.username,
        displayName: updatedUser.displayName || updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Server error during profile update" });
  }
});

module.exports = router;
