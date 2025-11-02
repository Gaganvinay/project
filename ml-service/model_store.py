# ml-service/model_store.py
import os
import joblib

MODEL_DIR = os.getenv("MODEL_DIR", "models")
ENGAGE_MODEL = os.path.join(MODEL_DIR, "engagement_clf.joblib")
RISK_MODEL = os.path.join(MODEL_DIR, "risk_reg.joblib")

def load_models():
    m1 = None; m2 = None
    if os.path.exists(ENGAGE_MODEL):
        m1 = joblib.load(ENGAGE_MODEL)
    if os.path.exists(RISK_MODEL):
        m2 = joblib.load(RISK_MODEL)
    return m1, m2
