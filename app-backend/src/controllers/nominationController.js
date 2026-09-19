import User from "../models/User.js";
import Nomination from "../models/Nomination.js";

const INACTIVITY_THRESHOLD_DAYS = 60; // 2 months

export const addOrUpdateNomination = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      nomineeName,
      nomineeEmail,
      nomineePhone,
      relationship,
      personalMessage,
      assetDistribution,
    } = req.body;

    // Validate required fields
    if (!nomineeName || !nomineeEmail || !nomineePhone || !relationship) {
      return res.status(400).json({
        message:
          "Missing required fields: nomineeName, nomineeEmail, nomineePhone, relationship",
      });
    }

    // Update user's nomination field
    const user = await User.findByIdAndUpdate(
      userId,
      {
        nomination: {
          nomineeName,
          nomineeEmail,
          nomineePhone,
          relationship,
          personalMessage: personalMessage || "",
          assetDistribution: assetDistribution || null,
          createdAt: new Date(),
          acknowledgedAt: null,
          acknowledgedByNominee: false,
        },
      },
      { new: true }
    ).select("-password");

    // Create or update nomination record
    let nomination = await Nomination.findOne({ nominatorId: userId });

    if (nomination) {
      nomination.nomineeName = nomineeName;
      nomination.nomineeEmail = nomineeEmail;
      nomination.nomineePhone = nomineePhone;
      nomination.relationship = relationship;
      nomination.personalMessage = personalMessage || "";
      nomination.assetDistribution = assetDistribution || null;
      nomination.status = "pending";
      nomination.inactivityNotificationSent = false;
      nomination.inactivityNotificationSentAt = null;
      nomination.acknowledgedByNominee = false;
      nomination.acknowledgedAt = null;
      await nomination.save();
    } else {
      nomination = new Nomination({
        nominatorId: userId,
        nomineeName,
        nomineeEmail,
        nomineePhone,
        relationship,
        personalMessage: personalMessage || "",
        assetDistribution: assetDistribution || null,
      });
      await nomination.save();
    }

    return res.status(200).json({
      message: "Nomination saved successfully",
      user,
      nomination,
    });
  } catch (error) {
    next(error);
  }
};

export const getNomination = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "nomination name email monthlyIncome investmentRecommendation"
    );

    if (!user || !user.nomination || !user.nomination.nomineeName) {
      return res.status(404).json({
        message: "No nomination found for this user",
      });
    }

    const nomination = await Nomination.findOne({ nominatorId: userId });

    return res.status(200).json({
      nomination: user.nomination,
      nominationDetails: nomination,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNomination = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      nomination: null,
    });

    await Nomination.deleteOne({ nominatorId: userId });

    return res.status(200).json({
      message: "Nomination deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Check for inactivity and send notifications to nominees
export const checkAndNotifyInactive = async (req, res, next) => {
  try {
    const thresholdDate = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    // Find all users with nominations who haven't logged in recently
    const inactiveUsers = await User.find({
      "nomination.nomineeName": { $exists: true, $ne: null },
      lastLogin: { $lt: thresholdDate },
    });

    const notifiedNominees = [];

    for (const user of inactiveUsers) {
      const nomination = await Nomination.findOne({
        nominatorId: user._id,
      });

      if (
        nomination &&
        !nomination.inactivityNotificationSent
      ) {
        // Mark as notified
        nomination.inactivityNotificationSent = true;
        nomination.inactivityNotificationSentAt = new Date();
        nomination.status = "notified";
        await nomination.save();

        notifiedNominees.push({
          nomineeName: nomination.nomineeName,
          nomineeEmail: nomination.nomineeEmail,
          nominatorName: user.name,
          relationship: nomination.relationship,
          personalMessage: nomination.personalMessage,
          assetDistribution: nomination.assetDistribution,
        });

        // In a real app, you would send email and create in-app notification here
        // For now, we'll log it
        console.log(
          `Inactivity notification: ${nomination.nomineeName} (${nomination.nomineeEmail}) for nominator ${user.name}`
        );
      }
    }

    return res.status(200).json({
      message: "Inactivity check completed",
      inactiveUsersProcessed: inactiveUsers.length,
      nomineesNotified: notifiedNominees,
    });
  } catch (error) {
    next(error);
  }
};

// Acknowledge nomination (nominee marks as read/understood)
export const acknowledgeNomination = async (req, res, next) => {
  try {
    const { nominatorEmail } = req.body;

    if (!nominatorEmail) {
      return res.status(400).json({
        message: "Nominator email is required",
      });
    }

    const nominator = await User.findOne({ email: nominatorEmail });

    if (!nominator) {
      return res.status(404).json({
        message: "Nominator not found",
      });
    }

    // Update nomination as acknowledged
    nominator.nomination.acknowledgedAt = new Date();
    nominator.nomination.acknowledgedByNominee = true;
    await nominator.save();

    const nomination = await Nomination.findOne({
      nominatorId: nominator._id,
    });

    if (nomination) {
      nomination.acknowledgedByNominee = true;
      nomination.acknowledgedAt = new Date();
      nomination.status = "acknowledged";
      await nomination.save();
    }

    return res.status(200).json({
      message: "Nomination acknowledged successfully",
    });
  } catch (error) {
    next(error);
  }
};
