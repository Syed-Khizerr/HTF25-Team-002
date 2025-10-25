const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const MONGO =
  process.env.MONGODB ||
  process.env.MONGO ||
  "mongodb://localhost:27017/studyroom";

async function cleanupMessages() {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const messagesCollection = db.collection("messages");

    // Count messages without serverId
    const countWithoutServerId = await messagesCollection.countDocuments({
      serverId: { $exists: false },
    });

    console.log(
      `Found ${countWithoutServerId} messages without serverId field`
    );

    if (countWithoutServerId > 0) {
      console.log("🗑️  Deleting messages without serverId...");
      const result = await messagesCollection.deleteMany({
        serverId: { $exists: false },
      });
      console.log(`✅ Deleted ${result.deletedCount} old messages`);
    } else {
      console.log("✅ No cleanup needed");
    }

    await mongoose.connection.close();
    console.log("✅ Cleanup complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

cleanupMessages();
