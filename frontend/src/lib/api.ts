import type { OnboardingData, AnalysisResponse } from "@/types/finance";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const MODEL_API_URL =
  import.meta.env.VITE_MODEL_API_URL || "http://localhost:8000";

// ─── Chat Types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatUserContext {
  name?: string;
  age_group?: string;
  monthly_income?: number;
  fixed_expenses?: number;
  variable_expenses?: number;
  risk_answers?: number[];
  risk_profile?: string;
  health_score?: number;
  goal_type?: string;
  target_amount?: number;
  timeline_months?: number;
  budget_allocation?: {
    name: string;
    percentage: number;
    recommended: number;
  }[];
  investment_allocation?: {
    name: string;
    allocation: number;
    reasoning?: string;
  }[];
}

/** Multi-asset mix from model-backend (percent of total portfolio). */
export interface AssetAllocationBreakdown {
  equity: number;
  bonds: number;
  gold: number;
  cash: number;
}

export interface RecommendResponse {
  risk_profile: string;
  recommended_portfolio: string | null;
  stocks: { ticker: string; expected_return: number }[];
  /** Per-stock weights within the equity sleeve (sum ~100%). */
  allocation: Record<string, number>;
  /** Equity / bonds / gold / cash (sum ~100%). */
  asset_allocation?: AssetAllocationBreakdown;
  /** Industry sectors distribution (sum ~100%). */
  sector_allocation?: Record<string, number>;
  expected_return: number;
  portfolio_volatility?: number;
  future_value: number | null;
  monte_carlo_analysis: unknown;
  risk_metrics?: {
    max_drawdown_p95?: number | null;
    worst_5pct_final_value?: number | null;
    safety_score?: number | null;
  } | null;
  age_group?: string;
  stock_price_history?: StockPriceHistory | null;
  stock_risk_return_points?: StockRiskReturnPoint[] | null;
  stock_correlation?: StockCorrelation | null;
  ai_explanation: string;
  explanation_source: string;
}

export interface StockPriceHistoryPoint {
  date: string;
  prices: Record<string, number>;
}

export interface StockPriceHistory {
  tickers: string[];
  data: StockPriceHistoryPoint[];
}

export interface StockRiskReturnPoint {
  ticker: string;
  expected_return: number;
  volatility: number;
}

export interface StockCorrelation {
  tickers: string[];
  matrix: number[][];
}

export async function recommendInvestments(
  authToken: string,
): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE_URL}/api/investments/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!res.ok) {
    let message = `Recommend API error: ${res.status}`;
    try {
      const errorData = (await res.json()) as { detail?: string };
      if (errorData?.detail) {
        message = errorData.detail;
      }
    } catch {
      const errorText = await res.text();
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }

  return (await res.json()) as RecommendResponse;
}

export async function getSavedInvestmentRecommendation(
  authToken: string,
): Promise<RecommendResponse | null> {
  const res = await fetch(`${API_BASE_URL}/api/investments/recommendation`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!res.ok) {
    let message = `Saved recommendation API error: ${res.status}`;
    try {
      const errorData = (await res.json()) as { message?: string; detail?: string };
      if (errorData?.detail || errorData?.message) {
        message = errorData.detail || errorData.message || message;
      }
    } catch {
      const errorText = await res.text();
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }

  const data = (await res.json()) as {
    recommendation?: RecommendResponse | null;
  };
  return data?.recommendation ?? null;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  userContext?: ChatUserContext,
  pageContext?: string,
): Promise<string> {
  try {
    const res = await fetch(`${MODEL_API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        user_context: userContext ?? null,
        page_context: pageContext ?? null,
      }),
    });
    if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
    const data = await res.json();
    return data.reply as string;
  } catch (err) {
    console.error("Chat API failed:", err);
    throw err;
  }
}

export async function analyzeFinances(
  data: OnboardingData,
): Promise<AnalysisResponse> {
  try {
    const res = await fetch(`${MODEL_API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.profile.name,
        dob: data.profile.dob,
        employment_status: data.profile.employmentStatus,
        monthly_income: data.financial.monthlyIncome,
        fixed_expenses: data.financial.fixedExpenses,
        variable_expenses: data.financial.variableExpenses,
        goal_type: data.goal.goalType,
        target_amount: data.goal.targetAmount,
        timeline_months: data.goal.timelineMonths,
        risk_answers: data.risk_answers,
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("API call failed, using mock data:", err);
    return getMockAnalysis(data);
  }
}

function getMockAnalysis(data: OnboardingData): AnalysisResponse {
  const income = data.financial.monthlyIncome;
  const risk = (data.risk_answers || [2, 2, 2, 2, 2]).reduce((a, b) => a + b, 0)
  const expenses =
    data.financial.fixedExpenses + data.financial.variableExpenses;
  const savings = Math.max(income - expenses, 0);
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const expenseRate = income > 0 ? Math.round((expenses / income) * 100) : 0;

  const totalForChart = income + Math.max(expenses, 0) + savings || 1;

  return {
    healthScore: Math.min(
      95,
      Math.max(40, 60 + (income > 5000 ? 15 : 0) + (risk > 5 ? 5 : 10)),
    ),
    riskProfile:
      risk <= 3 ? "Conservative" : risk <= 7 ? "Moderate" : "Aggressive",
    budgetAllocation: [
      {
        name: "Income",
        amount: income,
        percentage: Math.round((income / totalForChart) * 100),
        recommended: 100,
        color: "hsl(217, 71%, 45%)",
      },
      {
        name: "Expenses",
        amount: expenses,
        percentage: Math.round((Math.max(expenses, 0) / totalForChart) * 100),
        recommended: 70,
        color: "hsl(340, 60%, 50%)",
      },
      {
        name: "Savings",
        amount: savings,
        percentage: Math.round((savings / totalForChart) * 100),
        recommended: 20,
        color: "hsl(160, 60%, 45%)",
      },
    ],
    investmentAllocation:
      risk <= 3
        ? [
            {
              name: "Bonds",
              allocation: 50,
              color: "hsl(217, 71%, 45%)",
              reasoning: "Low-risk fixed income for capital preservation",
            },
            {
              name: "Money Market",
              allocation: 25,
              color: "hsl(160, 60%, 45%)",
              reasoning: "Liquid, stable returns",
            },
            {
              name: "Blue-chip Stocks",
              allocation: 15,
              color: "hsl(38, 92%, 50%)",
              reasoning: "Moderate growth with dividends",
            },
            {
              name: "REITs",
              allocation: 10,
              color: "hsl(280, 60%, 50%)",
              reasoning: "Real estate exposure with liquidity",
            },
          ]
        : risk <= 7
          ? [
              {
                name: "Index Funds",
                allocation: 40,
                color: "hsl(217, 71%, 45%)",
                reasoning: "Broad market exposure at low cost",
              },
              {
                name: "Bonds",
                allocation: 25,
                color: "hsl(160, 60%, 45%)",
                reasoning: "Income and stability",
              },
              {
                name: "Growth Stocks",
                allocation: 20,
                color: "hsl(38, 92%, 50%)",
                reasoning: "Higher growth potential",
              },
              {
                name: "International",
                allocation: 15,
                color: "hsl(280, 60%, 50%)",
                reasoning: "Geographic diversification",
              },
            ]
          : [
              {
                name: "Growth Stocks",
                allocation: 45,
                color: "hsl(217, 71%, 45%)",
                reasoning: "Maximum capital appreciation",
              },
              {
                name: "Tech/Innovation",
                allocation: 25,
                color: "hsl(160, 60%, 45%)",
                reasoning: "High-growth sector exposure",
              },
              {
                name: "International",
                allocation: 20,
                color: "hsl(38, 92%, 50%)",
                reasoning: "Emerging market opportunity",
              },
              {
                name: "Crypto/Alt",
                allocation: 10,
                color: "hsl(280, 60%, 50%)",
                reasoning: "Alternative high-risk assets",
              },
            ],
    insights: [
      {
        type: "tip",
        title: "Savings Rate",
        message: `Your savings rate of ${savingsRate}% is a good starting point. Automate your monthly savings to stay consistent.`,
      },
      {
        type: "warning",
        title: "Spending Level",
        message: `Your expenses are about ${expenseRate}% of your income. Try to keep this below 70% to leave room for savings.`,
      },
      {
        type: "achievement",
        title: "Great Start",
        message: `You've completed your financial profile — you're ahead of 70% of users!`,
      },
    ],
    monteCarlo: {
      successProbability: 72,
      projectedValues: Array.from({ length: 12 }, (_, i) => {
        const month = (i + 1) * (data.goal.timelineMonths / 12);
        const base =
          (data.goal.targetAmount / data.goal.timelineMonths) * month;
        return {
          month: Math.round(month),
          p10: Math.round(base * 0.6),
          p25: Math.round(base * 0.8),
          p50: Math.round(base),
          p75: Math.round(base * 1.2),
          p90: Math.round(base * 1.5),
        };
      }),
      scenarios: [
        {
          name: "Bear Market",
          probability: 15,
          finalAmount: data.goal.targetAmount * 0.65,
        },
        {
          name: "Conservative",
          probability: 30,
          finalAmount: data.goal.targetAmount * 0.85,
        },
        {
          name: "Expected",
          probability: 35,
          finalAmount: data.goal.targetAmount,
        },
        {
          name: "Bull Market",
          probability: 20,
          finalAmount: data.goal.targetAmount * 1.35,
        },
      ],
    },
  };
}
