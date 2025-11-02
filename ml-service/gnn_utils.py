import torch
import numpy as np

EVENT_MAP = {
    "interest": 0,
    "demo_booked": 1,
    "meeting_done": 2,
    "contract_review": 3,
    "signed": 4
}

def build_graph(events):
    nodes = []
    edges = [[], []]

    for idx, e in enumerate(events):
        et = EVENT_MAP.get(e["eventType"], 0)
        
        time_norm = (idx + 1) / len(events)
        is_final = 1 if et == EVENT_MAP["signed"] else 0

        nodes.append([et, time_norm, is_final, len(events)])  

        if idx > 0:
            edges[0].append(idx - 1)
            edges[1].append(idx)

    x = torch.tensor(np.array(nodes), dtype=torch.float32)
    edge_index = torch.tensor(edges, dtype=torch.long)
    return x, edge_index
