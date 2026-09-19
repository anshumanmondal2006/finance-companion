import RetirementPlan from '../models/RetirementPlan.js';
import User from '../models/User.js'; // <-- NEW: Import the User model

export const getRetirementPlan = async (req, res) => {
  try {
    const plan = await RetirementPlan.findOne({ userId: req.user._id });
    if (!plan) return res.status(200).json({ hasPlan: false, data: null });
    return res.status(200).json({ hasPlan: true, data: plan });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return res.status(500).json({ message: 'Server error while fetching plan.' });
  }
};

export const generateRetirementPlan = async (req, res) => {
  try {
    // 1. Get the payload from the frontend
    const payload = req.body;

    // --- NEW: FETCH RISK ANSWERS FROM THE DATABASE ---
    const user = await User.findById(req.user._id).select('risk_answers');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Inject the user's actual risk answers into the payload
    // Falling back to [1, 1, 1, 1, 1] just in case to match your User schema default
    payload.risk_answers = user.risk_answers && user.risk_answers.length > 0 
      ? user.risk_answers 
      : [1, 1, 1, 1, 1]; 

    // 2. Send data to Python AI Model
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    
    console.log("Calling AI Model with payload:", payload);
    const response = await fetch(`${pythonApiUrl}/api/retirement-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload), 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Model failed (${response.status}): ${errorText}`);
    }

    // 3. Receive live data from Python
    const aiData = await response.json();
    console.log("AI Plan generated successfully!");

    // Check if the model returned what we expect to prevent crashes
    if (!aiData || !aiData.portfolio) {
      throw new Error("Received malformed data from AI model.");
    }

    // 4. Sanitize the Keys so MongoDB doesn't crash on ticker dots
    const sanitizedAllocation = {};
    if (aiData.portfolio.allocation) {
      for (const [key, value] of Object.entries(aiData.portfolio.allocation)) {
        sanitizedAllocation[key.replace(/\./g, '_')] = value;
      }
    }
    
    const sanitizedStocks = aiData.portfolio.stocks 
      ? aiData.portfolio.stocks.map(stock => ({
          ...stock, 
          ticker: stock.ticker.replace(/\./g, '_')
        })) 
      : [];

    // 5. Construct the Database Document
    const planDocument = {
      userId: req.user._id,
      inputsUsed: {
        age: payload.age || 30,
        retirementAge: payload.retirement_age,
        monthlyExpenses: payload.monthly_expenses,
        income: payload.income,
        inflationScenario: payload.inflation_scenario,
        riskAnswers: payload.risk_answers 
      },
      years_to_retirement: aiData.years_to_retirement,
      inflation_rate: aiData.inflation_rate,
      retirement_corpus: aiData.retirement_corpus,
      
      portfolio: {
        age_group: aiData.portfolio.age_group,
        risk_profile: aiData.portfolio.risk_profile,
        recommended_portfolio: aiData.portfolio.recommended_portfolio,
        expected_return: aiData.portfolio.expected_return,
        portfolio_volatility: aiData.portfolio.portfolio_volatility,
        future_value: aiData.portfolio.future_value,
        asset_allocation: aiData.portfolio.asset_allocation,
        stocks: sanitizedStocks,         
        allocation: sanitizedAllocation,
        monte_carlo_analysis: aiData.portfolio.monte_carlo_analysis,
        
        ai_explanation: aiData.portfolio.ai_explanation,
        explanation_source: aiData.portfolio.explanation_source,
      },

      risk_metrics: aiData.portfolio.risk_metrics,
      stock_price_history: aiData.portfolio.stock_price_history,
      stock_risk_return_points: aiData.portfolio.stock_risk_return_points,
      stock_correlation: aiData.portfolio.stock_correlation
    };

    // 6. Save to Database
    const savedPlan = await RetirementPlan.findOneAndUpdate(
      { userId: req.user._id },
      { $set: planDocument },
      { returnDocument: 'after', upsert: true } 
    );

    return res.status(201).json({
      hasPlan: true,
      data: savedPlan
    });

  } catch (error) {
    console.error("Error generating retirement plan:", error);
    return res.status(500).json({ message: error.message || 'Server error while generating plan.' });
  }
};