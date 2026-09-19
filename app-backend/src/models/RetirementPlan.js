import mongoose from 'mongoose';

const retirementPlanSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  
  inputsUsed: {
    age: Number,
    retirementAge: Number,
    monthlyExpenses: Number,
    income: Number,
    inflationScenario: String
  },

  years_to_retirement: Number,
  inflation_rate: Number,
  retirement_corpus: Number,

  portfolio: {
    age_group: String,
    risk_profile: String,
    recommended_portfolio: String,
    expected_return: Number,
    portfolio_volatility: Number, // NEW
    future_value: Number,
    ai_explanation: String,
    explanation_source: String,
    
    // NEW
    asset_allocation: {
      equity: Number,
      bonds: Number,
      gold: Number,
      cash: Number
    },
    
    stocks: [{
      ticker: String,
      expected_return: Number
    }],

    allocation: {
      type: Map,
      of: Number 
    },

    monte_carlo_analysis: {
      simulation_summary: mongoose.Schema.Types.Mixed,
      statistics: mongoose.Schema.Types.Mixed,
      distribution_chart: {
        bins: [Number],
        counts: [Number],
        bin_width: Number
      },
      growth_paths_chart: {
        paths: [[Number]] 
      },
      simulations_metadata: mongoose.Schema.Types.Mixed
    }
  },

  // NEW ENHANCED DATA FIELDS
  risk_metrics: mongoose.Schema.Types.Mixed,
  stock_price_history: mongoose.Schema.Types.Mixed,
  stock_risk_return_points: mongoose.Schema.Types.Mixed,
  stock_correlation: mongoose.Schema.Types.Mixed,

  createdAt: { type: Date, default: Date.now }
});

const RetirementPlan = mongoose.model('RetirementPlan', retirementPlanSchema);
export default RetirementPlan;