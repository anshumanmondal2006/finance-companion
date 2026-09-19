import mongoose from "mongoose";

const UserGameResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  correctAnswers: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  passed: {
    type: Boolean,
    default: false,
  },
  mastered: {
    type: Boolean,
    default: false, // true if score is 100%
  },
  attempts: {
    type: Number,
    default: 1,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for quick lookups
UserGameResultSchema.index({ userId: 1, gameId: 1 });
UserGameResultSchema.index({ userId: 1, mastered: 1 });

export default mongoose.model("UserGameResult", UserGameResultSchema);
