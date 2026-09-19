def _encode_risk(risk_label: str) -> int:
    mapping = {"low": 1, "medium": 3, "high": 5}
    if risk_label not in mapping:
        raise ValueError(f"Unsupported risk level: {risk_label}")
    return mapping[risk_label]


def build_features(age, income, expenses, risk_score, timeline, goal_type):

    savings = income - expenses
    savings_rate = savings / income if income > 0 else 0

    goal = 0 if goal_type == "wealth" else 1
    encoded_risk = _encode_risk(risk_score)

    return {
        "age": age,
        "income": income,
        "expenses": expenses,
        "risk": encoded_risk,
        "timeline": timeline,
        "goal": goal,
        "savings_rate": savings_rate,
    }