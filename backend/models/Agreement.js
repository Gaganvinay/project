const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  fileUrl: String,
  text: String,
  status: { type: String, default: 'uploaded' },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agreement', AgreementSchema);
