# ml-service/bgac_model.py
from feature_extractor import extract_features_from_snapshot, features_to_vector
from model_store import load_models
import numpy as np

# Load models once if available
clf, reg = load_models()

def score_graph_snapshot_ml(snapshot):
    """
    Use trained models if available, otherwise fallback to heuristic.
    Returns dict with engagement probability, risk score, legacy fields.
    """

    # ---- Feature extraction ----
    feats = extract_features_from_snapshot(snapshot)
    vec = features_to_vector(feats).reshape(1, -1)

    # ---- Base prediction from ML or fallback ----
    if clf is not None and reg is not None:
        try:
            engage_prob = float(clf.predict_proba(vec)[:, 1][0])
            risk_score = float(reg.predict(vec)[0])
        except Exception:
            engage_prob = 0.5
            risk_score = 0.5
    else:
        # Simple heuristic fallback
        avg_wait = feats.get("avg_wait", 0.0)
        n_events = feats.get("n_events", 0)
        normalized_wait = 1.0 - (1.0 / (1.0 + avg_wait / 3600.0))

        engage_prob = max(0.0, min(1.0, 1.0 - normalized_wait * 0.9 + (n_events * 0.02)))
        risk_score = max(0.0, min(1.0, normalized_wait * 0.8 - (n_events * 0.015)))

    # ============================================================
    # ✅ Bayesian Update + Confidence Decay Module
    # ============================================================

    # previous belief provided by backend (or default to current estimate)
    prev_prob = float(snapshot.get("prev_engagement_prob", engage_prob))

    # time delay between actions (in seconds) passed from backend
    delay = float(snapshot.get("delay_seconds", 0.0))

    # Bayesian trust factor for historical signal
    decay_strength = 0.85  # tune 0.7–0.95

    # confidence decay over time (half-life ~2 hours)
    decay_factor = np.exp(-delay / 7200.0) if delay > 0 else 1.0

    # Updated posterior belief
    updated_prob = (prev_prob * decay_strength * decay_factor) + (engage_prob * (1 - decay_strength))
    updated_prob = float(max(0, min(1, updated_prob)))

    # replace engagement prob with Bayesian updated value
    engage_prob = updated_prob

    # Risk is opposite of engagement probability
    risk_score = float(max(0, min(1, 1.0 - engage_prob)))

    # ============================================================

    # ---- Compatibility Mapping for UI ----
    compliant = round(float(engage_prob), 4)
    anomaly = round(float(risk_score), 4)
    churn = round(max(0.0, min(1.0, 1.0 - engage_prob)), 4)

    return {
        "features": feats,
        "engagement_prob": engage_prob,
        "risk_score": risk_score,
        "compliant": compliant,
        "anomaly": anomaly,
        "churn-risk": churn
    }
