const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const MONGO =
  process.env.MONGODB ||
  process.env.MONGO ||
  "mongodb://localhost:27017/studyroom";

async function migrateMessages() {
  try {
    await mongoose.connect(MONGO);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const messagesCollection = db.collection("messages");
    const usersCollection = db.collection("users");

    // Find messages without displayName or avatar
    const messagesToUpdate = await messagesCollection
      .find({
        $or: [
          { displayName: { $exists: false } },
          { avatar: { $exists: false } },
        ],
      })
      .toArray();

    console.log(`Found ${messagesToUpdate.length} messages to update`);

    let updated = 0;
    for (const message of messagesToUpdate) {
      // Find user by username
      const user = await usersCollection.findOne({
        username: message.username,
      });

      if (user) {
        await messagesCollection.updateOne(
          { _id: message._id },
          {
            $set: {
              displayName: user.displayName || user.username,
              avatar: user.avatar || null,
            },
          }
        );
        updated++;
      } else {
        // If user not found, set displayName to username
        await messagesCollection.updateOne(
          { _id: message._id },
          {
            $set: {
              displayName: message.username,
              avatar: null,
            },
          }
        );
        updated++;
      }
    }

    console.log(`✅ Updated ${updated} messages with user data`);

    await mongoose.connection.close();
    console.log("✅ Migration complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

migrateMessages();
