import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  ageGroup: {
    type: String,
    enum: ["fresh-graduate", "middle-age", "elderly"],
    required: true,
  },
  category: {
    type: String,
    enum: ["budget", "investment", "portfolio", "retirement", "legacy"],
    required: true,
  },
  icon: {
    type: String,
    default: "🎮",
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "easy",
  },
  estimatedTime: {
    type: Number, // in minutes
    default: 10,
  },
  instructions: {
    type: String,
    required: true,
  },
  questions: [{
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Game", GameSchema);
