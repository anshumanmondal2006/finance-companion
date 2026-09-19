import Game from "../models/Game.js";
import UserGameResult from "../models/UserGameResult.js";
import User from "../models/User.js";

// Get games by age group (returns ALL games with mastered status flag)
export const getGamesByAgeGroup = async (req, res) => {
  try {
    const { ageGroup } = req.params;
    const userId = req.user?._id;

    console.log(`👤 User ID: ${userId}, 📍 Age Group: ${ageGroup}`);

    // Validate age group
    if (!["fresh-graduate", "middle-age", "elderly"].includes(ageGroup)) {
      return res.status(400).json({ error: "Invalid age group" });
    }

    // ✅ FETCH ALL GAMES (NOT FILTERED)
    const allGames = await Game.find({ ageGroup })
      .select("-questions")
      .sort({ createdAt: -1 });

    console.log(`📚 Total games for ${ageGroup}: ${allGames.length}`);

    let masteredCount = 0;
    const masteredGameIds = new Set();

    // If authenticated, find which games user has mastered
    if (userId) {
      try {
        const masteredGames = await UserGameResult.find({
          userId,
          mastered: true,
          gameId: { $in: allGames.map(g => g._id) }
        }).select("gameId");

        masteredCount = masteredGames.length;
        console.log(`⭐ User mastered: ${masteredCount}/${allGames.length}`);
        
        masteredGames.forEach(g => {
          masteredGameIds.add(g.gameId.toString());
        });
      } catch (dbError) {
        console.error("❌ Error fetching mastered games:", dbError);
      }
    }

    // ✅ ADD isMastered FLAG TO EACH GAME
    const gamesWithStatus = allGames.map(game => {
      const gameObj = game.toObject();
      gameObj.isMastered = masteredGameIds.has(game._id.toString());
      return gameObj;
    });

    console.log(`✅ Returning ${gamesWithStatus.length} games with status:`);
    gamesWithStatus.forEach((g, i) => {
      console.log(`   ${i + 1}. ${g.title} - isMastered: ${g.isMastered}`);
    });

    const allMastered = allGames.length > 0 && masteredCount === allGames.length;

    res.json({
      games: gamesWithStatus,
      totalGames: allGames.length,
      masteredCount,
      allMastered,
    });
  } catch (error) {
    console.error("❌ Error fetching games:", error);
    res.status(500).json({ error: "Failed to fetch games" });
  }
};

// Get single game with questions
export const getGameById = async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await Game.findById(gameId);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({ game });
  } catch (error) {
    console.error("Error fetching game:", error);
    res.status(500).json({ error: "Failed to fetch game" });
  }
};

// Submit game answers and get score, then save result
export const submitGameAnswers = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { answers } = req.body; // answers: [0, 2, 1, ...] (indices of selected options)
    const userId = req.user._id; // From auth middleware

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Calculate score
    let correctAnswers = 0;
    const feedback = game.questions.map((q, index) => ({
      question: q.question,
      userAnswer: answers[index],
      correctAnswer: q.correctAnswer,
      isCorrect: answers[index] === q.correctAnswer,
      explanation: q.explanation,
    }));

    correctAnswers = feedback.filter(f => f.isCorrect).length;
    const score = Math.round((correctAnswers / game.questions.length) * 100);
    const passed = score >= 70; // 70% to pass
    const mastered = score === 100; // 100% to master

    console.log(`📊 Game Result - Score: ${score}, Passed: ${passed}, Mastered: ${mastered}`);

    // Save game result to database
    const gameResult = new UserGameResult({
      userId,
      gameId,
      score,
      correctAnswers,
      totalQuestions: game.questions.length,
      passed,
      mastered,
    });

    await gameResult.save();
    console.log(`✅ Saved to UserGameResult: ${gameResult._id}`);

    // If user scored 100%, mark as mastered in User model
    if (mastered) {
      try {
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          {
            $addToSet: { gamesMasteredAgeGroups: game.ageGroup }
          },
          { new: true }
        );
        console.log(`⭐ Added '${game.ageGroup}' to user's mastered age groups`);
      } catch (dbError) {
        console.error("❌ Error updating user mastered games:", dbError);
      }
    }

    res.json({
      score,
      totalQuestions: game.questions.length,
      correctAnswers,
      feedback,
      passed,
      mastered,
    });
  } catch (error) {
    console.error("❌ Error submitting answers:", error);
    res.status(500).json({ error: "Failed to submit answers" });
  }
};

// Create game (admin only - for seeding)
export const createGame = async (req, res) => {
  try {
    const { title, description, ageGroup, category, icon, difficulty, estimatedTime, instructions, questions } = req.body;

    const game = new Game({
      title,
      description,
      ageGroup,
      category,
      icon,
      difficulty,
      estimatedTime,
      instructions,
      questions,
    });

    await game.save();
    res.status(201).json({ game });
  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({ error: "Failed to create game" });
  }
};
