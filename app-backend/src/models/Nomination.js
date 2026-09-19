import mongoose from "mongoose";

const nominationSchema = new mongoose.Schema(
  {
    nominatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nomineeName: {
      type: String,
      required: true,
    },
    nomineeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    nomineePhone: {
      type: String,
      required: true,
    },
    relationship: {
      type: String,
      required: true, // e.g., "Child", "Sibling", "Spouse", "Parent", "Friend"
    },
    personalMessage: String,
    assetDistribution: {
      type: mongoose.Schema.Types.Mixed, // e.g., { stocks: 50, bonds: 30, cash: 20 }
      default: null,
    },
    inactivityNotificationSent: {
      type: Boolean,
      default: false,
    },
    inactivityNotificationSentAt: {
      type: Date,
      default: null,
    },
    acknowledgedByNominee: {
      type: Boolean,
      default: false,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "notified", "acknowledged"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Nomination = mongoose.model("Nomination", nominationSchema);

export default Nomination;
