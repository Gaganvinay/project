# ml-service/graph_builder.py
from datetime import datetime
import networkx as nx

def iso_to_dt(ts):
    if ts is None:
        return datetime.utcnow()
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            return datetime.utcnow()
    return ts

class DynamicAdaptiveWeightedGraph:
    """
    DAWG: dynamic graph representation. Nodes = events; edges = temporal transitions with weight=seconds.
    This object can be used to incrementally add events.
    """
    def __init__(self):
        self.G = nx.DiGraph()
        self.last_event_by_vendor = {}  # vendorId -> last event dict

    def add_events_bulk(self, events):
        """
        events: list of {"_id":str, "vendorId":str, "eventType":str, "timestamp":str}
        Builds/updates graph for multiple events (assumes sorted by timestamp per vendor)
        """
        # group by vendor to do per-vendor sequences
        events_sorted = sorted(events, key=lambda e: (e.get("vendorId"), e.get("timestamp")))
        prev_by_vendor = {}
        for e in events_sorted:
            vid = e.get("vendorId")
            node_id = e.get("_id")
            ts = iso_to_dt(e.get("timestamp"))
            label = e.get("eventType", "EVENT")
            if node_id not in self.G:
                self.G.add_node(node_id, vendorId=vid, label=label, timestamp=ts.isoformat())
            if vid in prev_by_vendor:
                prev = prev_by_vendor[vid]
                prev_ts = iso_to_dt(prev.get("timestamp"))
                weight = max(0.0, (ts - prev_ts).total_seconds())
                # if edge exists, adaptively update average weight and count
                if self.G.has_edge(prev['_id'], node_id):
                    data = self.G[prev['_id']][node_id]
                    # maintain count & avg
                    cnt = data.get("count", 1)
                    avg = data.get("weight", weight)
                    new_avg = (avg * cnt + weight) / (cnt + 1)
                    self.G[prev['_id']][node_id].update({"weight": new_avg, "count": cnt + 1})
                else:
                    self.G.add_edge(prev['_id'], node_id, weight=weight, count=1)
            prev_by_vendor[vid] = e
            self.last_event_by_vendor[vid] = e

    def add_event_incremental(self, event):
        """
        Add a single new event (incremental update). Event is dict with vendorId, _id, eventType, timestamp.
        """
        vid = event.get("vendorId")
        node_id = event.get("_id")
        ts = iso_to_dt(event.get("timestamp"))
        label = event.get("eventType", "EVENT")
        if node_id not in self.G:
            self.G.add_node(node_id, vendorId=vid, label=label, timestamp=ts.isoformat())
        prev = self.last_event_by_vendor.get(vid)
        if prev:
            prev_ts = iso_to_dt(prev.get("timestamp"))
            weight = max(0.0, (ts - prev_ts).total_seconds())
            if self.G.has_edge(prev['_id'], node_id):
                data = self.G[prev['_id']][node_id]
                cnt = data.get("count", 1)
                avg = data.get("weight", weight)
                new_avg = (avg * cnt + weight) / (cnt + 1)
                self.G[prev['_id']][node_id].update({"weight": new_avg, "count": cnt + 1})
            else:
                self.G.add_edge(prev['_id'], node_id, weight=weight, count=1)
        self.last_event_by_vendor[vid] = event

    def snapshot_for_vendor(self, vendor_id):
        """
        Build node/edge lists relevant to vendor_id by selecting nodes with vendorId and relevant edges.
        """
        nodes = []
        edges = []
        for n, data in self.G.nodes(data=True):
            if data.get("vendorId") == vendor_id:
                nodes.append({"id": str(n), "label": data.get("label"), "timestamp": data.get("timestamp")})
        for u, v, data in self.G.edges(data=True):
            # include edge if both endpoints belong to vendor
            if u in [n['id'] for n in nodes] and v in [n['id'] for n in nodes]:
                edges.append({"from": str(u), "to": str(v), "weight": float(data.get("weight", 0.0)), "count": int(data.get("count", 1))})
        # sort nodes by timestamp
        nodes_sorted = sorted(nodes, key=lambda x: x.get("timestamp"))
        return {"nodes": nodes_sorted, "edges": edges}
