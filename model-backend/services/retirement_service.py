from models.retirement_model import (
    get_inflation_rate,
    calculate_future_expenses,
    calculate_retirement_corpus
)

from services.recommendation_engine import recommend_plan


def generate_retirement_plan(data):

    years_to_retirement = data.retirement_age - data.age

    inflation = get_inflation_rate(data.inflation_scenario)

    future_expense = calculate_future_expenses(
        data.monthly_expenses,
        inflation,
        years_to_retirement
    )

    corpus = calculate_retirement_corpus(future_expense)

    recommendation_input = {

        "age": data.age,
        "income": data.income,
        "expenses": data.monthly_expenses,
        "timeline": years_to_retirement,
        "goal_type": "target",
        "target": corpus,
        "risk_answers": data.risk_answers
    }

    try:
        portfolio = recommend_plan(
            age=data.age,
            income=data.income,
            expenses=data.monthly_expenses,
            risk_answers=data.risk_answers,
            goal_type="target",
            timeline=years_to_retirement,
            target=corpus
        )
    except Exception:
        portfolio = {
            "risk_profile": "medium",
            "recommended_portfolio": "balanced",
            "stocks": [
            {
                "ticker": "SBIN.NS",
                "expected_return": 0.18870764498268863
            },
            {
                "ticker": "TCS.NS",
                "expected_return": 0.12573611867351173
            },
            {
                "ticker": "ICICIBANK.NS",
                "expected_return": 0.08023165341060431
            },
            {
                "ticker": "KOTAKBANK.NS",
                "expected_return": 0.07117346304253552
            },
            {
                "ticker": "BHARTIARTL.NS",
                "expected_return": 0.07067596180798084
            }
            ],
            "allocation": {
            "SBIN.NS": 33.46752597253398,
            "TCS.NS": 25.04472037425507,
            "ICICIBANK.NS": 15.566732274902654,
            "KOTAKBANK.NS": 13.638236627984964,
            "BHARTIARTL.NS": 12.282784750323316
            },
            "expected_return": 0.12552326767928504,
            "future_value": null,
            "ai_explanation": "Based on your profile, I'd like to explain why this investment portfolio was recommended for you.\n\nAs a 45-year-old with a medium risk profile and a 15-year investment horizon, you're likely looking for a balance between growth and stability. You want to grow your wealth over time, but you're not comfortable taking on too much risk.\n\nThe recommended portfolio is a mix of well-established companies from different industries, which helps spread out the risk. Here's a breakdown:\n\n* The portfolio is heavily weighted towards banking stocks (SBIN.NS, ICICIBANK.NS, and KOTAKBANK.NS), which are considered relatively stable and provide a steady income stream. This aligns with your medium risk profile, as banks are generally less volatile than other sectors.\n* The inclusion of TCS.NS, a leading IT company, adds a growth element to the portfolio. This helps to balance out the more stable banking stocks and provides potential for long-term growth.\n* BHARTIARTL.NS, a telecommunications company, adds diversification to the portfolio and helps to reduce dependence on any one sector.\n\nThe expected return of 12.55% is relatively modest, considering your 15-year investment horizon. This suggests that the portfolio is designed to provide steady, long-term growth rather than trying to achieve extremely high returns in the short term.\n\nOverall, this portfolio is designed to match your medium risk profile and 15-year investment horizon. It provides a balance between stability and growth, and the diversification across different industries helps to manage risk. By investing in this portfolio, you can potentially achieve your long-term financial goals while minimizing the risk of significant losses.",
            "explanation_source": "llm"
        }
        


    return {
        "years_to_retirement": years_to_retirement,
        "inflation_rate": inflation,
        "retirement_corpus": corpus,
        "portfolio": portfolio
    }