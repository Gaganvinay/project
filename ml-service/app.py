# ml-service/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List
from pymongo import MongoClient
import os
from graph_builder import DynamicAdaptiveWeightedGraph, iso_to_dt
from bgac_model import score_graph_snapshot_ml
from graph_store import save_graph, load_graph
from datetime import datetime
import uvicorn

app = FastAPI(title="Vendor BGAC ML Service (full)")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["vendorbgac"]
events_collection = db["events"]

# instantiate a DAWG object — this will be our in-memory dynamic graph
DAWG = DynamicAdaptiveWeightedGraph()

# Load events from DB at startup to initialize DAWG (non-blocking minimal init)
def init_dawg_from_db(limit=10000):
    docs = list(events_collection.find({}, {"_id":1,"vendorId":1,"eventType":1,"timestamp":1}).sort("timestamp",1).limit(limit))
    normalized = []
    for d in docs:
        normalized.append({"_id": str(d.get("_id")), "vendorId": d.get("vendorId"), "eventType": d.get("eventType"), "timestamp": d.get("timestamp")})
    DAWG.add_events_bulk(normalized)
    print("DAWG initialized from DB with", len(normalized), "events")

@app.on_event("startup")
def startup_event():
    try:
        init_dawg_from_db()
    except Exception as e:
        print("DAWG init error:", e)

class EventIn(BaseModel):
    vendorId: str
    eventType: str
    timestamp: str = None
    metadata: Dict[str, Any] = {}

@app.post("/add_event")
def add_event(event: EventIn):
    """
    Persist event in DB and update DAWG incrementally, then compute snapshot+score.
    """
    doc = {
        "vendorId": event.vendorId,
        "eventType": event.eventType,
        "metadata": event.metadata,
        "timestamp": event.timestamp or datetime.utcnow().isoformat()
    }
    # insert into events collection
    res = events_collection.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    # incremental update DAWG
    DAWG.add_event_incremental({"_id": doc["_id"], "vendorId": doc["vendorId"], "eventType": doc["eventType"], "timestamp": doc["timestamp"]})
    # build snapshot for vendor
    snapshot = DAWG.snapshot_for_vendor(event.vendorId)
    # score
    score = score_graph_snapshot_ml(snapshot)
    # store snapshot
    save_graph(event.vendorId, snapshot["nodes"], snapshot["edges"])
    return {"vendorId": event.vendorId, "snapshot": snapshot, "score": score}

@app.get("/vendor_graph/{vendor_id}")
def vendor_graph(vendor_id: str):
    stored = load_graph(vendor_id)
    if stored:
        snapshot = {"nodes": stored.get("nodes", []), "edges": stored.get("edges", [])}
        score = score_graph_snapshot_ml(snapshot)
        return {"vendorId": vendor_id, "graph": snapshot, "score": score}
    # if not stored, build snapshot from DAWG (if present) or DB
    snapshot = DAWG.snapshot_for_vendor(vendor_id)
    # if empty, fallback to DB events
    if not snapshot["nodes"]:
        docs = list(events_collection.find({"vendorId": vendor_id}, {"_id":1,"eventType":1,"timestamp":1}).sort("timestamp",1))
        normalized = [{"_id": str(d.get("_id")), "eventType": d.get("eventType"), "timestamp": d.get("timestamp"), "vendorId": vendor_id} for d in docs]
        DAWG.add_events_bulk(normalized)
        snapshot = DAWG.snapshot_for_vendor(vendor_id)

    score = score_graph_snapshot_ml(snapshot)
    save_graph(vendor_id, snapshot["nodes"], snapshot["edges"])
    return {"vendorId": vendor_id, "graph": snapshot, "score": score}

@app.post("/train")
def train_route():
    """
    Trigger model training on server (synthetic data trainer provided).
    """
    try:
        from train_model import train_and_save_models
        clf_path, reg_path = train_and_save_models()
        return {"trained": True, "clf": clf_path, "reg": reg_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT",8001)), reload=True)
