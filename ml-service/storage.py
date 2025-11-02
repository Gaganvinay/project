
import pickle, os

STATE_FILE = "gnn_state.pkl"

def save_state(data):
    with open(STATE_FILE, "wb") as f:
        pickle.dump(data, f)

def load_state():
    if not os.path.exists(STATE_FILE):
        return {}
    return pickle.load(open(STATE_FILE, "rb"))
