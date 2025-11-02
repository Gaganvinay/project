const mongoose = require('mongoose');

const VendorSchema = new mongoose.Schema({
  name: String,
  email: String,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vendor', VendorSchema);
