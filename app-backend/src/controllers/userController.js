import User from "../models/User.js";

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      dob,
      employmentStatus,
      monthlyIncome,
      fixedExpenses,
      variableExpenses,
      goalType,
      targetAmount,
      timelineMonths,
      risk_answers,
    } = req.body;

    const updates = {};

    if (typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (dob !== undefined) {
      updates.dob = dob;
    }

    if (employmentStatus !== undefined) {
      updates.employmentStatus = employmentStatus;
    }

    if (monthlyIncome !== undefined) {
      updates.monthlyIncome = Number(monthlyIncome);
    }

    if (fixedExpenses !== undefined) {
      updates.fixedExpenses = Number(fixedExpenses);
    }

    if (variableExpenses !== undefined) {
      updates.variableExpenses = Number(variableExpenses);
    }

    if (goalType !== undefined) {
      updates.goalType = goalType;
    }

    if (targetAmount !== undefined) {
      updates.targetAmount = Number(targetAmount);
    }

    if (timelineMonths !== undefined) {
      updates.timelineMonths = Number(timelineMonths);
    }

    if (risk_answers !== undefined) {
      updates.risk_answers = risk_answers;
    }

    const updated = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({ user: updated });
  } catch (error) {
    next(error);
  }
};

export const saveOnboarding = async (req, res, next) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        dob: req.body.dob,
        employmentStatus: req.body.employmentStatus,
        monthlyIncome: req.body.monthlyIncome,
        fixedExpenses: req.body.fixedExpenses,
        variableExpenses: req.body.variableExpenses,
        goalType: req.body.goalType,
        targetAmount: req.body.targetAmount,
        timelineMonths: req.body.timelineMonths,
        risk_answers: req.body.risk_answers,
        lastLogin: new Date(),
      },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const updateLastLogin = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastLogin: new Date(),
    });
    next();
  } catch (error) {
    next(error);
  }
};
