import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  dob: Date,
  employmentStatus: String,

  monthlyIncome: Number,
  fixedExpenses: Number,
  variableExpenses: Number,

  goalType: String,
  targetAmount: Number,
  timelineMonths: Number,

  risk_answers: {
  type: [Number],
  default: [1, 1, 1, 1, 1], // Default fallback
  required: true
},

  investmentRecommendation: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  investmentRecommendationUpdatedAt: {
    type: Date,
    default: null,
  },

  lastLogin: {
    type: Date,
    default: Date.now,
  },

  nomination: {
    nomineeName: String,
    nomineeEmail: String,
    nomineePhone: String,
    relationship: String, // e.g., "Child", "Sibling", "Spouse"
    personalMessage: String,
    assetDistribution: mongoose.Schema.Types.Mixed, // e.g., { stocks: 50, bonds: 30, cash: 20 }
    createdAt: {
      type: Date,
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    acknowledgedByNominee: {
      type: Boolean,
      default: false,
    },
  },

  gamesMasteredAgeGroups: {
    type: [String], // e.g., ['fresh-graduate', 'middle-age']
    enum: ['fresh-graduate', 'middle-age', 'elderly'],
    default: [],
  },

},
{
  timestamps: true,
}
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;