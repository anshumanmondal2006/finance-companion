import os
from typing import Optional

from groq import AsyncGroq

SYSTEM_PROMPT = """You are FinanceBot, an intelligent AI financial advisor embedded inside FinancePRO — a Smart Personal Finance & Investment Advisor App.

You have access to the user's real-time financial data including their income, expenses, investment allocations, budget breakdown, risk profile, financial goals, and health score. Use this context to give highly personalized, actionable, and empathetic advice.

Your role adapts based on the user's age group:
- **Fresh Graduate (18–30)**: Focus on budgeting discipline, emergency funds, beginner investing, and building good money habits. Use simple, encouraging language.
- **Middle-Aged Professional (30–50)**: Focus on goal-based investing, retirement planning, portfolio optimization, tax-aware strategies, and asset allocation.
- **Elderly / Pre-Retired (50+)**: Focus on capital preservation, predictable income, legacy planning, and simplicity. Be calm, clear, and reassuring.

You can answer:
- "Why" questions: Explain the reasoning behind recommendations
- "What-if" scenario questions: e.g., "What if I invest ₹5000 more per month?"
- Budget and spending questions
- Investment and portfolio questions
- Goal feasibility questions
- General personal finance education (SIP, mutual funds, stocks, compounding, diversification, etc.)

Guidelines:
- Always be concise, friendly, and jargon-free unless the user asks for detail
- Ground your answers in the user's actual financial data when available
- Never recommend specific stock picks or guaranteed returns
- If you don't have enough context, ask a clarifying question
- Format responses with bullet points or short paragraphs for readability
- Use ₹ (Indian Rupee) as the default currency unless user data suggests otherwise
"""

PLACEHOLDER_API_KEYS = {
    "",
    "your-groq-api-key-here",
    "your_groq_api_key_here",
}


def get_groq_client() -> AsyncGroq:
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if api_key in PLACEHOLDER_API_KEYS:
        raise RuntimeError(
            "Groq API key is missing. Set GROQ_API_KEY in model-backend/.env before using chat."
        )
    return AsyncGroq(api_key=api_key)


def build_fallback_response(user_context=None, page_context: Optional[str] = None) -> str:
    suggestions: list[str] = []

    if user_context and user_context.monthly_income is not None:
        income = user_context.monthly_income
        fixed_expenses = user_context.fixed_expenses or 0
        variable_expenses = user_context.variable_expenses or 0
        savings = income - fixed_expenses - variable_expenses
        savings_rate = (savings / income * 100) if income > 0 else 0

        suggestions.append(
            f"Based on your current numbers, you're saving about ₹{savings:,.0f} per month ({savings_rate:.1f}% of income)."
        )

        if savings_rate < 10:
            suggestions.append("A good next step is to reduce one variable-expense category and redirect that amount into savings.")
        else:
            suggestions.append("You're already saving consistently, so the next step is to automate part of that surplus toward your main goal.")

    if user_context and user_context.goal_type:
        suggestions.append(
            f"Keep your plan focused on your primary goal: {user_context.goal_type.replace('-', ' ')}."
        )

    if page_context == "budget":
        suggestions.append("On the budget page, compare your top 2 spending categories against your target allocation and trim the one with the biggest gap first.")
    elif page_context == "investments":
        suggestions.append("On the investments page, review whether your asset mix matches your risk profile before increasing contributions.")
    elif page_context == "simulation":
        suggestions.append("On the simulation page, increasing monthly savings or extending the timeline usually has the biggest effect on success probability.")

    if not suggestions:
        suggestions.append("I can still help with budgeting, goal planning, and investment basics once the AI provider is configured.")

    body = "\n".join(f"- {item}" for item in suggestions[:3])
    return (
        "The live AI service is not available right now, so I'm using a local fallback response.\n\n"
        f"{body}\n\n"
        "To restore full AI chat, set a valid GROQ_API_KEY in model-backend/.env and restart the FastAPI server."
    )


def build_system_message(user_context=None, page_context: Optional[str] = None) -> str:
    """Append the user's live financial snapshot to the system prompt."""
    msg = SYSTEM_PROMPT

    if page_context:
        page_labels = {
            "dashboard": "Dashboard Overview (net worth, health score, asset allocation)",
            "budget": "Budget Breakdown page (spending categories, monthly trends)",
            "investments": "Investments page (portfolio, asset allocation, risk)",
            "simulation": "Goal Simulation page (Monte Carlo projections, goal tracking)",
            "settings": "Settings page",
            "landing": "Landing / Home page",
            "onboarding": "Onboarding page (user is setting up their profile)",
            "auth": "Authentication page",
        }
        label = page_labels.get(page_context, page_context)
        msg += f"\n\n📍 **Current Page**: The user is currently on the {label}."

    if user_context:
        msg += "\n\n📊 **User's Financial Profile**:\n"
        uc = user_context

        if uc.name:
            msg += f"- Name: {uc.name}\n"
        if uc.age_group:
            age_labels = {
                "fresh-graduate": "Fresh Graduate (18–30)",
                "middle-age": "Middle-Aged Professional (30–50)",
                "elderly": "Elderly / Pre-Retired (50+)",
            }
            msg += f"- Age Group: {age_labels.get(uc.age_group, uc.age_group)}\n"
        if uc.monthly_income is not None:
            msg += f"- Monthly Income: ₹{uc.monthly_income:,.0f}\n"
        if uc.fixed_expenses is not None:
            msg += f"- Fixed Expenses: ₹{uc.fixed_expenses:,.0f}\n"
        if uc.variable_expenses is not None:
            msg += f"- Variable Expenses: ₹{uc.variable_expenses:,.0f}\n"
        if uc.monthly_income and uc.fixed_expenses is not None and uc.variable_expenses is not None:
            total_exp = uc.fixed_expenses + uc.variable_expenses
            savings = uc.monthly_income - total_exp
            savings_rate = (savings / uc.monthly_income * 100) if uc.monthly_income > 0 else 0
            msg += f"- Monthly Savings: ₹{savings:,.0f} ({savings_rate:.1f}% savings rate)\n"
        if uc.risk_tolerance is not None:
            msg += f"- Risk Tolerance Score: {uc.risk_tolerance}/10\n"
        if uc.risk_profile:
            msg += f"- Risk Profile: {uc.risk_profile}\n"
        if uc.health_score is not None:
            msg += f"- Financial Health Score: {uc.health_score:.0f}/100\n"
        if uc.goal_type:
            msg += f"- Primary Goal: {uc.goal_type.replace('-', ' ').title()}\n"
        if uc.target_amount is not None:
            msg += f"- Goal Target Amount: ₹{uc.target_amount:,.0f}\n"
        if uc.timeline_months is not None:
            msg += f"- Goal Timeline: {uc.timeline_months} months ({uc.timeline_months // 12} years {uc.timeline_months % 12} months)\n"
        if uc.budget_allocation:
            msg += "- Budget Allocation:\n"
            for cat in uc.budget_allocation:
                msg += f"  • {cat.get('name', '')}: {cat.get('percentage', 0)}% (recommended: {cat.get('recommended', 0)}%)\n"
        if uc.investment_allocation:
            msg += "- Investment Portfolio:\n"
            for asset in uc.investment_allocation:
                reasoning = asset.get('reasoning', '')
                msg += f"  • {asset.get('name', '')}: {asset.get('allocation', 0)}%"
                if reasoning:
                    msg += f" — {reasoning}"
                msg += "\n"

    return msg


async def get_chat_response(messages: list, user_context=None, page_context: Optional[str] = None) -> str:
    """Call Groq API and return the assistant's reply."""
    system_message = build_system_message(user_context, page_context)

    groq_messages = [{"role": "system", "content": system_message}]
    for msg in messages:
        groq_messages.append({"role": msg.role, "content": msg.content})

    try:
        client = get_groq_client()
        completion = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=groq_messages,
            temperature=0.7,
            max_tokens=1024,
        )
    except Exception:
        return build_fallback_response(user_context, page_context)

    return completion.choices[0].message.content
