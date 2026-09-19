def calculate_risk_score(answers):

    score = sum(answers)

    if score <= 10:
        return "low"

    elif score <= 18:
        return "medium"

    else:
        return "high"