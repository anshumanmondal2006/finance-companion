from pydantic import BaseModel, Field
from typing import Optional



class RecommendationRequest(BaseModel):
    age: int
    income: float
    expenses: float
    # Investment horizon in years (may be fractional, e.g. timeline_months / 12).
    timeline: float = Field(..., gt=0)
    goal_type: str
    target: float | None = None
    risk_answers: list[int]
    # Optional overrides (Goal Simulation / custom runs)
    monthly_contribution: float | None = None
    expected_return: float | None = None
    volatility: float | None = None
    simulations: int | None = Field(default=None, ge=100, le=100_000)
    inflation: float | None = Field(default=None, ge=0, le=1)


class ChatMessage(BaseModel):
    role: str        # "user" or "assistant"
    content: str


class UserContext(BaseModel):
    """Snapshot of the user's financial profile sent from the frontend store."""
    name: Optional[str] = None
    age_group: Optional[str] = None          # fresh-graduate | middle-age | elderly
    monthly_income: Optional[float] = None
    fixed_expenses: Optional[float] = None
    variable_expenses: Optional[float] = None
    risk_tolerance: Optional[int] = None     # 1-10
    risk_profile: Optional[str] = None      # Conservative | Moderate | Aggressive
    health_score: Optional[float] = None
    goal_type: Optional[str] = None
    target_amount: Optional[float] = None
    timeline_months: Optional[int] = None
    budget_allocation: Optional[list[dict]] = None
    investment_allocation: Optional[list[dict]] = None


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    user_context: Optional[UserContext] = None
    page_context: Optional[str] = None      # e.g. "dashboard", "budget", "investments"


class RetirementRequest(BaseModel):
    age: int
    retirement_age: int
    monthly_expenses: float
    inflation_scenario: str
    income: float
    risk_answers: list[int]


class GoalSimulationRequest(BaseModel):
    monthly_sip: float = Field(..., ge=0)
    expected_return: float = Field(..., ge=0, le=100)
    volatility: float = Field(..., ge=0, le=100)
    timeline_months: int = Field(..., ge=1, le=1200)
    target_amount: float = Field(..., ge=0)
    simulations: int = Field(default=1000, ge=1000, le=10000)
    inflation: float = Field(default=0, ge=0, le=100)
    initial_investment: float = Field(default=0, ge=0)