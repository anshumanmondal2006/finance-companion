PORTFOLIOS = {

    "aggressive": {
        "equity": 80,
        "debt": 15,
        "gold": 5
    },

    "balanced": {
        "equity": 60,
        "debt": 30,
        "gold": 10
    },

    "conservative": {
        "equity": 40,
        "debt": 50,
        "gold": 10
    }
}

def score_portfolio(portfolio, risk, timeline):

    score = 0

    equity = portfolio["equity"]

    # risk matching
    if risk == "high":
        score += equity * 0.4

    elif risk == "medium":
        score += (100 - abs(equity - 60)) * 0.4

    else:
        score += (100 - equity) * 0.4

    # timeline factor
    if timeline > 7:
        score += equity * 0.3
    else:
        score += (100 - equity) * 0.3

    return score

def recommend_portfolio(risk, timeline):

    best = None
    best_score = -1

    for name, portfolio in PORTFOLIOS.items():

        score = score_portfolio(portfolio, risk, timeline)

        if score > best_score:
            best_score = score
            best = name

    return best, PORTFOLIOS[best]