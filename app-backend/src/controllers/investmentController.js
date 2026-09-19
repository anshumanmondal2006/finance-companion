const MODEL_API_URL = process.env.MODEL_API_URL || "http://localhost:8000";

const getAgeFromDob = (dob) => {
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const diff = Date.now() - birthDate.getTime();
  return Math.max(1, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
};

export const recommendInvestmentPlan = async (req, res, next) => {
  try {
    const user = req.user;
    const age = getAgeFromDob(user?.dob);
    const income = Number(user?.monthlyIncome);
    const fixedExpenses = Number(user?.fixedExpenses);
    const variableExpenses = Number(user?.variableExpenses);
    const expenses = fixedExpenses + variableExpenses;
    const timeline = Math.max(1, Math.ceil(Number(user?.timelineMonths) / 12));
    const goal_type = user?.goalType;
    const target = goal_type === "target" ? Number(user?.targetAmount) : null;
    const risk_answers =
      user?.risk_answers?.length === 5 ? user.risk_answers : [2, 2, 2, 2, 2];

    if (
      !age ||
      Number.isNaN(income) ||
      Number.isNaN(expenses) ||
      !goal_type ||
      !risk_answers
    ) {
      return res.status(400).json({
        message:
          "User financial profile is incomplete. Please complete onboarding first.",
      });
    }

    const modelRes = await fetch(`${MODEL_API_URL}/api/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        age,
        income,
        expenses,
        timeline,
        goal_type,
        target,
        risk_answers,
      }),
    });

    const data = await modelRes.json();

    if (!modelRes.ok) {
      return res.status(modelRes.status).json({
        message:
          data?.detail || data?.message || "Failed to get recommendation",
      });
    }

    req.user.investmentRecommendation = data;
    req.user.investmentRecommendationUpdatedAt = new Date();
    await req.user.save();

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

export const getSavedInvestmentPlan = async (req, res, next) => {
  try {
    return res.status(200).json({
      recommendation: req.user.investmentRecommendation || null,
      updatedAt: req.user.investmentRecommendationUpdatedAt || null,
    });
  } catch (error) {
    return next(error);
  }
};
