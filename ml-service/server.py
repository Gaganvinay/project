import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from fastapi.middleware.cors import CORSMiddleware
from torch_geometric.data import Data
import time  # --- 1. ADDED IMPORT ---

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- REAL GNN MODEL -------- #

class FraudGNN(torch.nn.Module):
    def __init__(self):
        super(FraudGNN, self).__init__()
        # --- 2. CHANGED GNN INPUT ---
        # Input features are now 2 (event_type, engagement_score)
        self.conv1 = GCNConv(2, 8) 
        self.conv2 = GCNConv(8, 1)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index)
        x = torch.relu(x)
        x = self.conv2(x, edge_index)
        return torch.sigmoid(x)

model = FraudGNN()
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

# -------- MEMORY -------- #

vendor_events: Dict[str, List[str]] = {}
# --- 2. UPDATED MEMORY ---
vendor_engagement: Dict[str, float] = {}      # Replaced vendor_score
vendor_last_event_time: Dict[str, float] = {} # New: To track time
# Removed vendor_decay

EVENT_MAP = {
    "send": 0,
    "sign": 1,
    "publish": 2,
    "recieve": 3,
    "fraud_alert": 4,
}

# Constants for the new formula
ENGAGEMENT_BOOST = 0.1   # Amount score increases per event
ENGAGEMENT_DECAY_RATE = 0.99 # Multiplier per second (0.99 = 1% decay per sec)


class Event(BaseModel):
    vendorId: str
    eventType: str
    metadata: dict = {}

def build_graph(vendor: str):
    events = vendor_events[vendor]
    x = []
    edges = []

    # Get the current engagement score for this vendor
    current_engagement = vendor_engagement.get(vendor, 0.1)

    for i, evt in enumerate(events):
        evt_idx = EVENT_MAP.get(evt, 0)
        # --- 3. UPDATED FEATURES ---
        x.append([evt_idx, current_engagement]) # Features: event_type, engagement
        if i > 0:
            edges.append([i - 1, i])

    x = torch.tensor(x, dtype=torch.float32)
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous() if edges else torch.tensor([[0],[0]])
    return Data(x=x, edge_index=edge_index)

@app.get("/")
def home():
    return {"status": "GNN ML Service Running ✅"}

@app.post("/add_event")
async def log_event(event: Event):
    vendor = event.vendorId
    current_time = time.time()

    if vendor not in vendor_events:
        vendor_events[vendor] = []
        vendor_engagement[vendor] = 0.1
        vendor_last_event_time[vendor] = current_time
    
    vendor_events[vendor].append(event.eventType)

    # --- 4. NEW ENGAGEMENT FORMULA ---
    
    # 1. Calculate time decay
    last_time = vendor_last_event_time[vendor]
    time_delta_seconds = current_time - last_time
    
    # Apply exponential decay for every second passed
    # score = score * (0.99 ^ num_seconds)
    decay_factor = ENGAGEMENT_DECAY_RATE ** time_delta_seconds
    current_engagement = vendor_engagement[vendor] * decay_factor
    
    # 2. Add the event boost
    new_engagement = current_engagement + ENGAGEMENT_BOOST
    
    # 3. Cap the score at 1.0
    vendor_engagement[vendor] = min(new_engagement, 1.0)
    
    # 4. Update the last event time
    vendor_last_event_time[vendor] = current_time
    
    # --- END OF NEW FORMULA ---

    data = build_graph(vendor)

    model.train()
    optimizer.zero_grad()

    out = model(data.x, data.edge_index)
    score = out[-1].item()

    # Inverted logic: 0.0 for fraud, 1.0 for normal
    label = 0.0 if event.eventType == "fraud_alert" else 1.0
    loss = F.binary_cross_entropy(out[-1], torch.tensor([label]))

    loss.backward()
    optimizer.step()

    print(f"[ML] vendor={vendor} event={event.eventType} score={score:.4f} loss={loss.item():.4f}")

    return {
        "vendorId": vendor,
        "event": event.eventType,
        "events": vendor_events[vendor],
        "gnn_score": round(score, 4),
        "engagement": round(vendor_engagement[vendor], 4), # Changed from decay
        "time_since_last_event": round(time_delta_seconds, 2),
        "loss": float(loss.item())
    }