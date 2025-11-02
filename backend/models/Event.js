const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  eventType: { type: String, required: true },
  metadata: { type: Object },
  timestamp: { type: Date, default: Date.now },

  // ✅ ML Prediction fields for analytics
  prediction: {
    gnn_score: { type: Number, default: null },
    trust_score: { type: Number, default: null },
    decay: { type: Number, default: null },  
    raw: { type: Object, default: null } // stores entire ML response for debugging
  }
});

// ✅ Prevent model overwrite error in dev
module.exports = mongoose.models.Event || mongoose.model("Event", EventSchema);
