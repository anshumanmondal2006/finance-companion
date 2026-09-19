def calculate_savings(income, expenses):
    return max(income - expenses, 0)


def monthly_investment_capacity(savings):
    return savings * 0.5


def future_value_sip(sip, annual_return, years):
    r = annual_return / 12
    n = years * 12
    fv = sip * ((1 + r)**n - 1) / r
    return fv


def required_sip(target, annual_return, years):
    r = annual_return / 12
    n = years * 12
    sip = target * r / ((1 + r)**n - 1)
    return sip