const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  vendorId: { type: String, required: true, unique: true },
  name: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);
