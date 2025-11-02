from pymongo import MongoClient
import os
import json

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/vendorbgac")
client = MongoClient(MONGO_URI)
db = client.get_database()

def save_graph(vendor_id, nodes, edges):
    db.vendor_graphs.update_one(
        {"vendorId": vendor_id},
        {"$set": {"nodes": nodes, "edges": edges, "updatedAt": db.command("serverStatus")}},
        upsert=True
    )

def load_graph(vendor_id):
    doc = db.vendor_graphs.find_one({"vendorId": vendor_id})
    if not doc:
        return {"nodes": [], "edges": []}
    return {"nodes": doc.get("nodes", []), "edges": doc.get("edges", [])}
