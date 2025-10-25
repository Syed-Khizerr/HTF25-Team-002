// Script to wipe all collections and reset the database
const mongoose = require("mongoose");

const MONGODB_URI = "mongodb://localhost:27017/studyroom";

async function wipeDatabase() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`\nFound ${collections.length} collections:`);
    collections.forEach((col) => console.log(`- ${col.name}`));

    console.log("\n🗑️  Deleting all collections...");

    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`✅ Dropped collection: ${collection.name}`);
    }

    console.log("\n✨ Database wiped successfully!");
    console.log("All collections have been deleted. Fresh start! 🎉\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error wiping database:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

wipeDatabase();
