# services/monte_carlo_simulator.py

from typing import Dict, Any
import numpy as np

from models.monte_carlo_model import MonteCarloSimulator


class MonteCarloService:
    """
    Service layer connecting recommendation engine with Monte Carlo model.
    Also prepares graph-ready data for frontend visualization.
    """

    def __init__(
        self,
        monthly_investment: float,
        years: float,
        expected_return: float,
        volatility: float,
        target_amount: float | None = 0.0,
        initial_investment: float = 0.0,
        simulations: int = 5000,
        inflation_rate: float = 0.06,
    ):
        self.monthly_investment = monthly_investment
        self.years = years
        self.expected_return = expected_return
        self.volatility = volatility
        # API may pass None for non-target goals; simulator expects a numeric target (0 = no goal).
        self.target_amount = 0.0 if target_amount is None else float(target_amount)
        self.initial_investment = initial_investment
        self.simulations = simulations
        self.inflation_rate = inflation_rate

    def run(self) -> Dict[str, Any]:
        simulator = MonteCarloSimulator(
            monthly_investment=self.monthly_investment,
            years=self.years,
            expected_return=self.expected_return,
            volatility=self.volatility,
            simulations=self.simulations,
            initial_investment=self.initial_investment,
            target_amount=self.target_amount,
            inflation_rate=self.inflation_rate,
        )

        return simulator.run_simulation()
