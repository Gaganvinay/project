# ml-service/feature_extractor.py
import numpy as np
import pandas as pd
from datetime import datetime

def extract_features_from_snapshot(snapshot):
    """
    snapshot: {"nodes":[{id,label,timestamp}], "edges":[{from,to,weight,count}]}
    returns: dict of features
    """
    nodes = snapshot.get("nodes", [])
    edges = snapshot.get("edges", [])

    n_events = len(nodes)
    if n_events == 0:
        return {
            "n_events": 0,
            "avg_wait": 0.0,
            "median_wait": 0.0,
            "std_wait": 0.0,
            "unique_actions": 0,
            "edge_count": 0,
            "avg_edge_count": 0.0,
            "last_event_age": 0.0
        }

    # compute inter-event times (some edges may not be contiguous; fallback to timestamp diffs)
    ts = [datetime.fromisoformat(n["timestamp"]) for n in nodes]
    diffs = []
    for i in range(1, len(ts)):
        diffs.append((ts[i] - ts[i-1]).total_seconds())
    if not diffs:
        diffs = [0.0]
    avg_wait = float(np.mean(diffs))
    median_wait = float(np.median(diffs))
    std_wait = float(np.std(diffs))

    unique_actions = len(set([n.get("label") for n in nodes]))
    edge_count = len(edges)
    # average edge 'count' (how many times transition occurred) - robust
    avg_edge_count = float(np.mean([e.get("count",1) for e in edges])) if edges else 0.0

    # age since last event in seconds
    last_event_age = (datetime.utcnow() - ts[-1]).total_seconds()

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
    return feats

def features_to_vector(feats):
    """
    Convert dict to array (order is fixed). Returns numpy array shape (n_features,)
    """
    order = ["n_events","avg_wait","median_wait","std_wait","unique_actions","edge_count","avg_edge_count","last_event_age"]
    return np.array([feats.get(k,0.0) for k in order], dtype=float)
