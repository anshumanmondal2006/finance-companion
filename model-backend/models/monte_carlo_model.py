# models/monte_carlo_model.py

from typing import Dict, Any
import numpy as np


class MonteCarloSimulator:
    """
    Monte Carlo simulation model for portfolio growth.
    Simulates market scenarios to estimate target achievement and shortfall.
    """

    def __init__(
        self,
        monthly_investment: float,
        years: float,
        expected_return: float,
        volatility: float,
        simulations: int = 5000,
        initial_investment: float = 0.0,
        target_amount: float = 0.0,
        inflation_rate: float = 0.06,
    ):
        self.monthly_investment = monthly_investment
        self.years = years
        self.months = max(1, int(round(years * 12)))  # Use rounded months for simulation steps
        self.expected_return = expected_return
        self.volatility = volatility
        self.simulations = simulations
        self.initial_investment = initial_investment
        self.target_amount = target_amount
        self.inflation_rate = inflation_rate

    def run_simulation(self) -> dict:
        """
        Run Monte Carlo simulation for monthly portfolio growth.
        """
        # Coerce values and normalize rates. API may send decimals (0.12) or percentages (12).
        target_amt = max(0.0, 0.0 if self.target_amount is None else float(self.target_amount))
        months = max(1, int(self.months))
        sims = int(np.clip(int(self.simulations), 1000, 10000))

        def _to_decimal(rate: float) -> float:
            return rate / 100.0 if abs(rate) > 1.0 else rate

        expected_return = _to_decimal(float(self.expected_return))
        volatility = max(0.0, _to_decimal(float(self.volatility)))
        inflation_rate = max(0.0, _to_decimal(float(self.inflation_rate)))

        adjusted_goal = target_amt
        if target_amt > 0:
            adjusted_goal = target_amt * ((1.0 + inflation_rate) ** (months / 12.0))

        # Random monthly returns from normal distribution.
        monthly_returns = np.random.normal(
            loc=expected_return / 12.0,
            scale=volatility / np.sqrt(12.0),
            size=(sims, months),
        )

        portfolio_paths = np.zeros((sims, months + 1), dtype=np.float64)
        portfolio_paths[:, 0] = max(0.0, float(self.initial_investment))

        monthly_sip = max(0.0, float(self.monthly_investment))
        for month in range(months):
            portfolio_paths[:, month + 1] = (
                portfolio_paths[:, month] * (1.0 + monthly_returns[:, month]) + monthly_sip
            )

        portfolio_paths = np.clip(portfolio_paths, a_min=0.0, a_max=None)
        final_values = portfolio_paths[:, -1]

        p10 = float(np.percentile(final_values, 10))
        p25 = float(np.percentile(final_values, 25))
        p50 = float(np.percentile(final_values, 50))
        p75 = float(np.percentile(final_values, 75))
        p90 = float(np.percentile(final_values, 90))
        mean_value = float(np.mean(final_values))
        std_value = float(np.std(final_values))

        if adjusted_goal <= 0:
            probability_pct = 100.0
        else:
            probability_pct = float(np.mean(final_values >= adjusted_goal) * 100.0)

        shortfall = max(0.0, adjusted_goal - p50)
        required_sip_increase = 0.0
        if shortfall > 0:
            monthly_rate = expected_return
            if monthly_rate > 0:
                denom = ((1.0 + monthly_rate) ** months) - 1.0
                if denom > 0:
                    required_sip_increase = float(shortfall * monthly_rate / denom)
            if required_sip_increase <= 0:
                required_sip_increase = float(shortfall / months)

        p10_path = np.percentile(portfolio_paths, 10, axis=0)
        p50_path = np.percentile(portfolio_paths, 50, axis=0)
        p90_path = np.percentile(portfolio_paths, 90, axis=0)
        trajectory = [
            {
                "month": int(m),
                "p10": float(p10_path[m]),
                "p50": float(p50_path[m]),
                "p90": float(p90_path[m]),
            }
            for m in range(months + 1)
        ]

        # New response contract + legacy keys for backward compatibility.
        return {
            "probability": probability_pct,
            "p10": p10,
            "p50": p50,
            "p90": p90,
            "mean": mean_value,
            "std_dev": std_value,
            "percentiles": {
                "10": p10,
                "25": p25,
                "50": p50,
                "75": p75,
                "90": p90,
                "p10": p10,
                "p25": p25,
                "p50": p50,
                "p75": p75,
                "p90": p90,
            },
            "trajectory": trajectory,
            "final_values": final_values.tolist(),
            "adjusted_goal": adjusted_goal,
            "total_simulations": sims,
            "summary": {
                "mean": mean_value,
                "median": p50,
                "worst_case": p10,
                "best_case": p90,
                "std_dev": std_value,
                "success_probability": probability_pct / 100.0,
            },
            "failure_analysis": {
                "shortfall": shortfall,
                "required_sip_increase": required_sip_increase,
                "future_target_inflation_adjusted": adjusted_goal,
            },
            "graph_data": {
                "months": list(range(months + 1)),
                "p10": p10_path.tolist(),
                "p50": p50_path.tolist(),
                "p90": p90_path.tolist(),
            },
        }

    def _format_static_result(self, value: float, future_target: float) -> dict:
        target_amt = 0.0 if self.target_amount is None else float(self.target_amount)
        success = 1.0 if value >= future_target or target_amt <= 0 else 0.0
        shortfall = max(0.0, future_target - value)
        return {
            "summary": {
                "mean": value, "median": value, "worst_case": value, "best_case": value,
                "std_dev": 0.0, "success_probability": success,
            },
            "failure_analysis": {
                "shortfall": shortfall,
                "required_sip_increase": shortfall / self.months if self.months > 0 else shortfall,
                "future_target_inflation_adjusted": future_target,
            },
            "percentiles": {"p10": value, "p25": value, "p50": value, "p75": value, "p90": value},
            "graph_data": {
                "months": list(range(self.months + 1)),
                "p10": [value] * (self.months + 1),
                "p50": [value] * (self.months + 1),
                "p90": [value] * (self.months + 1),
            },
            "total_simulations": self.simulations,
        }
