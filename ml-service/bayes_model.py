import math
from collections import defaultdict

# Prior probabilities (editable later)
transition_counts = defaultdict(lambda: defaultdict(int))
state_counts = defaultdict(int)

# Initialize some dummy priors (can learn from data later)
priors = {
    "send": 0.8,
    "open": 0.6,
    "view": 0.5,
    "fill": 0.4,
    "sign": 0.2
}

def update_transition(prev_state, next_state):
    transition_counts[prev_state][next_state] += 1
    state_counts[prev_state] += 1

def transition_prob(prev_state, next_state):
    if state_counts[prev_state] == 0: return 0.0001
    return transition_counts[prev_state][next_state] / state_counts[prev_state]

def bayesian_update(path):
    prob = 1.0
    for i in range(len(path)-1):
        a, b = path[i], path[i+1]
        prior = priors.get(b, 0.01)
        likelihood = transition_prob(a, b)
        prob *= (likelihood * prior)
    return prob
def confidence_decay(seconds, decay_rate=0.01):
    return math.exp(-decay_rate * seconds)
