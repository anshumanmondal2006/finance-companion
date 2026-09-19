# schemas/monte_carlo_schema.py

from pydantic import BaseModel
from typing import Optional


class SimulationStats(BaseModel):
    """
    Statistics from Monte Carlo simulation.
    """

    mean_final_value: float
    median_final_value: float
    min_value: float
    max_value: float
    p10: float
    p90: float
    success_probability: Optional[float]


class MonteCarloResponse(BaseModel):
    """
    Full response returned from Monte Carlo simulation.
    """

    simulations_run: int
    timeline_years: int
    monthly_investment: float
    target_amount: Optional[float]
    stats: SimulationStats
