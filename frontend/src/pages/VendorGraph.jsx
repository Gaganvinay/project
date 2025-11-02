import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import CytoscapeComponent from "react-cytoscapejs";
//import "./VendorGraph.css"; // optional; I'll include a simple style snippet below

export default function VendorGraph() {
  const { id } = useParams();
  const [elements, setElements] = useState([]);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null); // for sidebar/tooltip
  const cyRef = useRef(null);

  // Helper: normalize backend graph -> elements array
  function normalizeGraph(graph) {
    if (!graph) return [];

    // Nodes may be objects {id,label,timestamp} or simple strings
    const rawNodes = graph.nodes || [];
    const rawEdges = graph.edges || [];

    // Map of id -> nodeData (dedupe)
    const nodeMap = new Map();
    rawNodes.forEach((n) => {
      // support if node is provided as string or object
      const idVal = typeof n === "string" ? n : (n.id ?? n._id ?? n.key);
      const label = (typeof n === "string") ? n : (n.label ?? n.name ?? "event");
      const timestamp = (typeof n === "string") ? null : (n.timestamp ?? n.time ?? null);
      if (!nodeMap.has(idVal)) {
        nodeMap.set(idVal, { id: idVal, label, timestamp });
      }
    });

    // Build elements (nodes)
    const nodes = Array.from(nodeMap.values()).map((n) => ({
      data: { id: String(n.id), label: n.label, timestamp: n.timestamp },
    }));

    // Build edges: accept both {from,to} and {source,target}
    const edges = rawEdges.map((e) => {
      // handle different backend forms
      const source = e.source ?? e.from ?? e.src ?? e.u ?? null;
      const target = e.target ?? e.to ?? e.dst ?? e.v ?? null;
      const weight = e.weight ?? e.w ?? null;
      const count = e.count ?? 1;
      return { source, target, weight, count };
    });

    // Filter edges to those connecting known nodes (prevents disconnected stray edges)
    const validEdges = edges.filter((ed) => nodeMap.has(String(ed.source)) && nodeMap.has(String(ed.target)));

    // Map to cytoscape edge objects and add id
    const cyEdges = validEdges.map((ed, idx) => ({
      data: {
        id: `e-${String(ed.source)}-${String(ed.target)}-${idx}`,
        source: String(ed.source),
        target: String(ed.target),
        weight: ed.weight,
        count: ed.count,
      },
    }));

    return [...nodes, ...cyEdges];
  }

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setError(null);
        const res = await axios.get(`http://localhost:5000/api/events/graph/${id}`, { timeout: 12000 });
        // debug log for you
        console.log("[VendorGraph] backend response:", res.data);

        // backend may return either res.data.graph or res.data.snapshot
        const graph = res.data.graph ?? res.data.snapshot ?? res.data;
        const normalizedElements = normalizeGraph(graph);

        if (normalizedElements.length === 0) {
          setError("Graph is empty for this vendor (no nodes/edges).");
        } else {
          setError(null);
        }

        setElements(normalizedElements);

        // small delay to let Cytoscape mount then run layout
        setTimeout(() => {
          if (cyRef.current) {
            try {
              const cy = cyRef.current;
              const layout = cy.layout({ name: "cose", animate: true, fit: true });
              layout.run();
            } catch (err) {
              console.warn("layout error:", err);
            }
          }
        }, 200);
      } catch (err) {
        console.error("[VendorGraph] fetch error:", err);
        setError("Failed to load graph (check backend). See console.");
      }
    };

    fetchGraph();
    // re-fetch every 20s to keep graph live (optional). Remove if not wanted.
    const interval = setInterval(fetchGraph, 20000);
    return () => clearInterval(interval);
  }, [id]);

  // stylesheet with label, hover, edge label for weight
  const stylesheet = [
    {
      selector: "node",
      style: {
        "background-color": "#0074D9",
        label: "data(label)",
        "text-valign": "center",
        "text-halign": "center",
        color: "#fff",
        "font-size": "11px",
        width: "48px",
        height: "48px",
      },
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 3,
        "border-color": "#FFD700",
        "background-color": "#005bb5",
      },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#999",
        "target-arrow-color": "#999",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "label": "data(weight)",
        "font-size": "9px",
        "text-rotation": "autorotate",
      },
    },
    {
      selector: "edge.hidden",
      style: {
        opacity: 0.2,
      },
    },
  ];

  // set up click handler & hover via cy callback
  const onCy = (cy) => {
    cyRef.current = cy;

    // remove previous listeners (safe)
    cy.removeAllListeners();

    // click node -> set sidebar info
    cy.on("tap", "node", (evt) => {
      const d = evt.target.data();
      setSelectedNode({
        id: d.id,
        label: d.label,
        timestamp: d.timestamp,
        // gather outgoing edges with weight/count
        outgoing: cy
          .edges(`[source = "${d.id}"]`)
          .map((edge) => ({
            id: edge.id(),
            to: edge.target().id(),
            weight: edge.data("weight"),
            count: edge.data("count"),
          })),
      });
    });

    // click background -> deselect
    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });
  };

  return (
    <div className="vendor-graph-root">
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h2>Vendor Behavior Graph — {id}</h2>
          {error && <div style={{ color: "red" }}>{error}</div>}
          <div className="graph-box">
            <CytoscapeComponent
              elements={elements}
              style={{ width: "100%", height: "600px" }}
              layout={{ name: "cose" }}
              stylesheet={stylesheet}
              cy={onCy}
            />
          </div>
        </div>

        <div style={{ width: 300, borderLeft: "1px solid #eee", paddingLeft: 12 }}>
          <h3>Node details</h3>
          {selectedNode ? (
            <>
              <div><strong>Label:</strong> {selectedNode.label}</div>
              <div><strong>ID:</strong> {selectedNode.id}</div>
              <div><strong>Timestamp:</strong> {selectedNode.timestamp ?? "—"}</div>
              <div style={{ marginTop: 8 }}>
                <strong>Outgoing transitions:</strong>
                {selectedNode.outgoing.length ? (
                  <ul>
                    {selectedNode.outgoing.map((o) => (
                      <li key={o.id}>
                        → {o.to} (weight: {o.weight ?? "—"}, count: {o.count ?? 1})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>None</div>
                )}
              </div>
            </>
          ) : (
            <div>Select a node to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}
