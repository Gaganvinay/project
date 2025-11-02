const express = require("express");
const axios = require("axios");
const Event = require("../models/Event");
const router = express.Router();

const ML_URL = process.env.ML_URL || "http://localhost:8000";

// In-memory store for previous probability
const prevProbStore = {};
const getPrevProb = (vid) => prevProbStore[vid] ?? 0.5;
const setPrevProb = (vid, val) => (prevProbStore[vid] = val);

// ✅ Get all events (for vendor dropdown in analytics)
router.get("/all", async (req, res) => {
  try {
    const events = await Event.find().lean();
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Graph data route (unchanged)
router.get("/graph/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const events = await Event.find({ vendorId }).sort({ timestamp: 1 }).lean();

    if (!events.length)
      return res.json({ vendorId, nodes: [], edges: [], score: null });

    const nodes = [];
    const edges = [];

    events.forEach((e, i) => {
      nodes.push({
        id: `${e._id}`,
        label: e.eventType,
        timestamp: e.timestamp
      });

      if (i > 0) {
        edges.push({
          source: `${events[i - 1]._id}`,
          target: `${e._id}`
        });
      }
    });

    let delaySeconds = 0;
    if (events.length > 1) {
      const last = new Date(events[events.length - 2].timestamp);
      const now = new Date(events[events.length - 1].timestamp);
      delaySeconds = (now - last) / 1000;
    }

    const snapshot = {
      events,
      prev_engagement_prob: getPrevProb(vendorId),
      delay_seconds: delaySeconds
    };

    let mlScore = {};
    try {
      const mlResp = await axios.post(`${ML_URL}/score_snapshot`, snapshot);
      mlScore = mlResp.data;
      if (mlScore?.engagement_prob)
        setPrevProb(vendorId, mlScore.engagement_prob);
    } catch (e) {
      console.error("⚠️ ML scoring failed:", e.message);
    }

    return res.json({
      vendorId,
      nodes,
      edges,
      score: mlScore
    });
  } catch (err) {
    console.error("Graph fetch failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Save Event + GNN Prediction
router.post("/", async (req, res) => {
  try {
    const { vendorId, eventType, metadata } = req.body;

    if (!vendorId || !eventType)
      return res.status(400).json({ error: "vendorId & eventType required" });

    const event = new Event({
      vendorId,
      eventType,
      metadata
    });

    await event.save();

    let prediction = null;

    try {
      const mlResp = await axios.post(`${ML_URL}/add_event`, {
        vendorId,
        eventType,
        metadata,
        prev_engagement_prob: getPrevProb(vendorId)
      });

      prediction = mlResp.data || null;

      if (prediction) {
        // ✅ Extract values safely
        const gnn = prediction.gnn_score ?? prediction.engagement_prob ?? null;
        const trust = prediction.trust_score ?? null;
        const decay = prediction.decay ?? null;

        // ✅ Save scores in DB properly
        event.prediction = {
          gnn_score: gnn,
          trust_score: trust,
          decay: decay,
          raw: prediction
        };

        await event.save();

        if (prediction.engagement_prob)
          setPrevProb(vendorId, prediction.engagement_prob);

        console.log(`✅ Saved Prediction | Vendor: ${vendorId} | GNN=${gnn} | Trust=${trust} | Decay=${decay}`);
      }
    } catch (e) {
      console.warn("⚠️ ML service down, logging only", e.message);
    }

    return res.json({ saved: true, event, prediction });

  } catch (err) {
    console.error("Saving event failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Raw event debug endpoint
router.get("/:vendorId", async (req, res) => {
  try {
    const events = await Event.find({ vendorId: req.params.vendorId })
      .sort({ timestamp: -1 })
      .lean();
    res.json({ vendorId: req.params.vendorId, events });
  } catch (err) {
    console.error("Fetch events failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
