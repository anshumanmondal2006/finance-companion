import os
from typing import Any, Dict, List, Tuple

from groq import Groq


def explain(age, risk, goal, timeline):

    reasons: List[str] = []

    if risk == "high":
        reasons.append("You indicated high risk tolerance.")

    if timeline > 7:
        reasons.append("Your long investment horizon allows growth investments.")

    if age < 35:
        reasons.append("You are young, so higher equity exposure is suitable.")

    if goal == "wealth":
        reasons.append("The strategy prioritizes long-term wealth growth.")

    return reasons


def _build_llm_prompt(
    profile: Dict[str, Any],
    allocation: Dict[str, float],
    portfolio_return: float,
    *,
    stock_allocation: Dict[str, float] | None = None,
) -> str:
    age = profile.get("age")
    income = profile.get("income")
    risk_profile = profile.get("risk_profile")
    horizon = profile.get("timeline")

    allocation_lines = [
        f"- {asset}: {weight:.2f}%"
        for asset, weight in allocation.items()
    ]
    allocation_text = "\n".join(allocation_lines)

    stock_allocation_text = ""
    if stock_allocation:
        # Keep prompt short: include top ~10 by weight.
        sorted_stocks = sorted(stock_allocation.items(), key=lambda kv: kv[1], reverse=True)[:10]
        stock_lines = [f"- {ticker}: {weight:.2f}%" for ticker, weight in sorted_stocks]
        stock_allocation_text = "\n".join(stock_lines)

    prompt = f"""
Explain why the following investment portfolio was recommended:

User profile:
Age: {age}
Income: {income}
Risk profile: {risk_profile}
Investment horizon: {horizon} years

Portfolio allocation:
{allocation_text}
Expected return: {portfolio_return:.2%}

Stock allocation (equity sleeve):
{stock_allocation_text if stock_allocation_text else "- (not available)"}

Generate a clear, concise explanation suitable for a retail investor, avoiding jargon and focusing on how the portfolio matches the user's risk profile and goals.
"""
    return prompt.strip()


def _fallback_explanation(
    profile: Dict[str, Any],
    *,
    stock_allocation: Dict[str, float] | None = None,
) -> Tuple[str, str]:
    reasons = explain(
        age=profile.get("age"),
        risk=profile.get("risk_profile"),
        goal=profile.get("goal_type"),
        timeline=profile.get("timeline"),
    )
    text = " ".join(reasons)
    if stock_allocation:
        top = sorted(stock_allocation.items(), key=lambda kv: kv[1], reverse=True)[:5]
        top_text = ", ".join([f"{t} ({w:.1f}%)" for t, w in top])
        text = f"{text} Top stock weights: {top_text}."
    return text, "rule_based"


def generate_ai_explanation(
    profile: Dict[str, Any],
    allocation: Dict[str, float],
    portfolio_return: float,
    *,
    stock_allocation: Dict[str, float] | None = None,
) -> Tuple[str, str]:
    """
    Generate a natural-language explanation for the recommended portfolio
    using Groq's LLM API.

    Falls back to the rule-based `explain` output if no API key is configured
    or the API call fails.

    Returns (explanation_text, source) where source is \"llm\" or \"rule_based\".
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return _fallback_explanation(profile, stock_allocation=stock_allocation)

    try:
        client = Groq(api_key=api_key)
    except Exception:
        return _fallback_explanation(profile, stock_allocation=stock_allocation)

    prompt = _build_llm_prompt(
        profile,
        allocation,
        portfolio_return,
        stock_allocation=stock_allocation,
    )

    try:
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful financial advisor explaining investment portfolios to retail investors in simple language."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        content = response.choices[0].message.content if response.choices else ""
        return (content or ""), "llm"
    except Exception:
        return _fallback_explanation(profile, stock_allocation=stock_allocation)