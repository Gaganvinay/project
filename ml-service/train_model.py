# ml-service/train_model.py
import os
import joblib
import numpy as np
import pandas as pd
from feature_extractor import extract_features_from_snapshot, features_to_vector
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, mean_squared_error

MODEL_DIR = os.getenv("MODEL_DIR", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# For a demo: we synthesize training data from historical events in Mongo or generate synthetic.
def synthesize_training_data(n=1000):
    """
    Create synthetic snapshots and labels for quick training demo.
    Label semantics:
      - engagement_label (0/1) where higher events & low avg_wait => engaged
      - risk_score (0..1) continuous
    """
    X = []
    y_engage = []
    y_risk = []
    import random
    for _ in range(n):
        n_events = random.choice([1,2,3,4,5,6,7,8,10])
        avg_wait = max(1.0, random.expovariate(1/300.0)) * (5.0 if n_events<=2 else 1.0)  # shorter waits for more events
        median_wait = avg_wait * (0.9 + random.random()*0.4)
        std_wait = avg_wait * 0.3 * random.random()
        unique_actions = min(n_events, random.randint(1,4))
        edge_count = n_events-1
        avg_edge_count = 1 + random.random()*2
        last_event_age = random.random()*86400  # up to 1 day
        feats = {
            "n_events": n_events,
            "avg_wait": avg_wait,
            "median_wait": median_wait,
            "std_wait": std_wait,
            "unique_actions": unique_actions,
            "edge_count": edge_count,
            "avg_edge_count": avg_edge_count,
            "last_event_age": last_event_age
        }
        X.append(features_to_vector(feats))
        # engagement label heuristics
        engage = 1 if (n_events >= 3 and avg_wait < 1800) else 0
        risk = min(1.0, max(0.0, (avg_wait/3600.0) * 0.5 + (1.0 if unique_actions<=1 else 0.0)*0.3 + random.random()*0.2))
        y_engage.append(engage)
        y_risk.append(risk)
    X = np.vstack(X)
    y_engage = np.array(y_engage)
    y_risk = np.array(y_risk)
    return X, y_engage, y_risk

def train_and_save_models():
    X, y_engage, y_risk = synthesize_training_data(2000)
    X_train, X_test, y_train, y_test = train_test_split(X, y_engage, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    preds = clf.predict_proba(X_test)[:,1]
    try:
        auc = roc_auc_score(y_test, preds)
    except Exception:
        auc = None

    # train regressor for risk as continuous outcome
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_risk, test_size=0.2, random_state=42)
    reg = RandomForestRegressor(n_estimators=100, random_state=42)
    reg.fit(X_train_r, y_train_r)
    preds_r = reg.predict(X_test_r)
    try:
        mse = mean_squared_error(y_test_r, preds_r)
    except Exception:
        mse = None

    # save models
    clf_path = os.path.join(MODEL_DIR, "engagement_clf.joblib")
    reg_path = os.path.join(MODEL_DIR, "risk_reg.joblib")
    joblib.dump(clf, clf_path)
    joblib.dump(reg, reg_path)
    print("Saved models:", clf_path, reg_path, " AUC:", auc, "MSE:", mse)
    return clf_path, reg_path

if __name__ == "__main__":
    train_and_save_models()
