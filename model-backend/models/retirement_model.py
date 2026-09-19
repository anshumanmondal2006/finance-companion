import math


def get_inflation_rate(scenario: str):

    mapping = {
        "conservative": 0.05,
        "realistic": 0.06,
        "pessimistic": 0.07
    }

    return mapping.get(scenario, 0.06)


def calculate_future_expenses(monthly_expense, inflation, years):

    future_expense = monthly_expense * ((1 + inflation) ** years)

    return future_expense


def calculate_retirement_corpus(future_monthly_expense):

    annual_expense = future_monthly_expense * 12

    corpus = annual_expense * 25

    return corpus