// backend/routes/analytics.js
const express = require("express");
const Event = require("../models/Event");
const router = express.Router();

// GET /api/analytics/gnn/:vendorId
router.get("/gnn/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    // fetch events with prediction, sorted ascending by timestamp
    const events = await Event.find({ vendorId, "prediction.gnn_score": { $exists: true } })
      .sort({ timestamp: 1 })
      .lean();

    const series = events.map(e => {
      const pred = e.prediction || {};
      return {
        timestamp: e.timestamp,
        gnn_score: pred.gnn_score ?? pred.engagement_prob ?? null,
        engagement_prob: pred.engagement_prob ?? null,
        decay_factor: pred.decay_factor ?? pred.decay ?? null,
        raw: pred
      };
    });

    res.json({ vendorId, series });
  } catch (err) {
    console.error("Analytics fetch failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
