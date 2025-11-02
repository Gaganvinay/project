const express = require("express");
const axios = require("axios");
const Event = require("../models/Event");
const router = express.Router();

const ML_URL = process.env.ML_URL || "http://localhost:8001";

// in-memory store of last probability per vendor
const prevProbStore = {};
const getPrevProb = (vid) => prevProbStore[vid] ?? 0.5;
const setPrevProb = (vid, val) => (prevProbStore[vid] = val);

// ✅ GET Graph & Score
router.get("/graph/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const events = await Event.find({ vendorId }).sort({ timestamp: 1 }).lean();

    if (!events.length)
      return res.json({ vendorId, nodes: [], edges: [], score: null });

    // ---- build nodes/edges for frontend graph ----
    const nodes = [];
    const edges = [];

    events.forEach((e, i) => {
      const nodeId = `${e._id}`;
      nodes.push({
        id: nodeId,
        label: e.eventType,
        timestamp: e.timestamp
      });

      if (i > 0) {
        edges.push({
          source: `${events[i - 1]._id}`,
          target: nodeId
        });
      }
    });

    // ---- compute delay seconds ----
    let delaySeconds = 0;
    if (events.length > 1) {
      const last = new Date(events[events.length - 2].timestamp);
      const now = new Date(events[events.length - 1].timestamp);
      delaySeconds = (now - last) / 1000;
    }

    // call ML service
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

// ✅ POST log event → forward to ML & respond
router.post("/", async (req, res) => {
  try {
    const { vendorId, eventType, metadata } = req.body;
    if (!vendorId || !eventType)
      return res
        .status(400)
        .json({ error: "vendorId & eventType required" });

    const event = await new Event({
      vendorId,
      eventType,
      metadata
    }).save();

    // send to ML python
    let prediction = null;
    try {
      const mlResp = await axios.post(`${ML_URL}/add_event`, {
        vendorId,
        eventType,
        metadata,
        prev_engagement_prob: getPrevProb(vendorId)
      });

      prediction = mlResp.data;
      if (prediction?.engagement_prob)
        setPrevProb(vendorId, prediction.engagement_prob);
    } catch (e) {
      console.warn("⚠️ ML service down, logging only");
    }

    return res.json({ saved: true, event, prediction });
  } catch (err) {
    console.error("Saving event failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Get raw events for debugging
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
