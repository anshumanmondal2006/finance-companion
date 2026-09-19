import numpy as np
import pandas as pd

data = []

for _ in range(20000):

    age = np.random.randint(21,65)
    income = np.random.randint(30000,200000)
    expenses = np.random.randint(10000,150000)

    savings_rate = (income-expenses)/income

    risk = np.random.randint(1,5)
    timeline = np.random.randint(1,30)

    goal = np.random.randint(0,2)

    if risk >= 4 and timeline > 7:
        portfolio = "aggressive"

    elif risk <= 2 or age > 55:
        portfolio = "conservative"

    else:
        portfolio = "balanced"

    data.append([
        age,income,expenses,risk,timeline,goal,savings_rate,portfolio
    ])

df = pd.DataFrame(data,columns=[
"age","income","expenses","risk","timeline","goal","savings_rate","portfolio"
])

df.to_csv("portfolio_dataset.csv",index=False)