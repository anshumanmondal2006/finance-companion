import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib

df = pd.read_csv("portfolio_dataset.csv")

X = df.drop("portfolio",axis=1)
y = df["portfolio"]

X_train,X_test,y_train,y_test = train_test_split(X,y,test_size=0.2)

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=10
)

model.fit(X_train,y_train)

print("Accuracy:",model.score(X_test,y_test))

joblib.dump(model,"portfolio_model.pkl")