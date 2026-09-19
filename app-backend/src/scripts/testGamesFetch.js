import mongoose from "mongoose";
import Game from "../models/Game.js";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/finance-companion");
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const testGamesFetch = async () => {
  await connectDB();

  try {
    // Test each age group
    const ageGroups = ["fresh-graduate", "middle-age", "elderly"];
    
    for (const ageGroup of ageGroups) {
      console.log(`\n📍 Searching for ${ageGroup} games...`);
      const games = await Game.find({ ageGroup });
      console.log(`Found ${games.length} games`);
      if (games.length > 0) {
        games.forEach((game, idx) => {
          console.log(`  ${idx + 1}. ${game.title} (ID: ${game._id})`);
        });
      }
    }

    // Total count
    const totalGames = await Game.countDocuments();
    console.log(`\n📊 Total games in database: ${totalGames}`);

    // Show sample structure
    const sampleGame = await Game.findOne();
    if (sampleGame) {
      console.log(`\n📋 Sample game structure:`, {
        _id: sampleGame._id,
        title: sampleGame.title,
        ageGroup: sampleGame.ageGroup,
        questionCount: sampleGame.questions.length,
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
};

testGamesFetch();
