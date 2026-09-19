import mongoose from 'mongoose';
import Game from '../models/Game.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkGames() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const count = await Game.countDocuments();
    const games = await Game.find({}, 'title ageGroup');
    
    console.log(`\n📊 Total games in database: ${count}`);
    console.log('\n📋 Games by age group:');
    
    games.forEach((game) => {
      console.log(`  - ${game.title} (${game.ageGroup})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Check complete');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkGames();
