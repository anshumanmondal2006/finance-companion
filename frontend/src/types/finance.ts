export type AgeGroup = 'fresh-graduate' | 'middle-age' | 'elderly';

export type RiskLevel = 'Conservative' | 'Moderate' | 'Aggressive';

export type EmploymentStatus = 'employed' | 'self-employed' | 'student' | 'unemployed' | 'retired';

export type GoalType = 'wealth' | 'target';

export interface UserProfile {
  name: string;
  dob: string;
  employmentStatus: EmploymentStatus;
}

export interface FinancialData {
  monthlyIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
}

export interface GoalData {
  goalType: GoalType;
  targetAmount: number;
  timelineMonths: number;
}

export interface OnboardingData {
  profile: UserProfile;
  financial: FinancialData;
  goal: GoalData;
  risk_answers: number[]; // 1-10 per question
}

/** Backend `monte_carlo_analysis` payload (snake_case). */
export interface MonteCarloRawData {
  probability?: number;
  p10?: number;
  p50?: number;
  p90?: number;
  mean?: number;
  std_dev?: number;
  adjusted_goal?: number;
  final_values?: number[];
  trajectory?: { month: number; p10: number; p50: number; p90: number }[];
  summary?: {
    mean: number;
    median: number;
    worst_case: number;
    best_case: number;
    std_dev: number;
    success_probability: number;
  };
  failure_analysis: {
    shortfall: number;
    required_sip_increase: number;
    future_target_inflation_adjusted: number;
  };
  percentiles: {
    p10?: number;
    p25?: number;
    p50?: number;
    p75?: number;
    p90?: number;
    "10"?: number;
    "25"?: number;
    "50"?: number;
    "75"?: number;
    "90"?: number;
  };
  graph_data?: {
    months: number[];
    p10: number[];
    p50: number[];
    p90: number[];
  };
  total_simulations: number;
}

export interface BudgetCategory {
  name: string;
  amount: number;
  percentage: number;
  recommended: number;
  color: string;
}

export interface InvestmentAsset {
  name: string;
  allocation: number;
  color: string;
  reasoning?: string;
}

export interface Insight {
  type: 'tip' | 'warning' | 'achievement';
  title: string;
  message: string;
}

export interface MonteCarloResult {
  successProbability: number;
  /** p25/p75 optional for legacy mock data */
  projectedValues: { month: number; p10: number; p50: number; p90: number; p25?: number; p75?: number }[];
  scenarios: { name: string; probability: number; finalAmount: number }[];
  failureAnalysis?: MonteCarloRawData['failure_analysis'];
}


export interface AnalysisResponse {
  healthScore: number;
  riskProfile: RiskLevel;
  budgetAllocation: BudgetCategory[];
  investmentAllocation: InvestmentAsset[];
  insights: Insight[];
  monteCarlo?: MonteCarloResult;
}

export function getAgeGroup(dob: string): AgeGroup {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age <= 28) return 'fresh-graduate';
  if (age <= 50) return 'middle-age';
  return 'elderly';
}
