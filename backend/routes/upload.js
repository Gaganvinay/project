const express = require('express');
const Agreement = require('../models/Agreement');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { vendorId, fileUrl, text } = req.body;
    if (!vendorId || !fileUrl) return res.status(400).json({ error: 'vendorId and fileUrl required' });

    const agreement = new Agreement({ vendorId, fileUrl, text });
    await agreement.save();

    res.json({ saved: true, agreement });
  } catch (err) {
    console.error('Error in upload route:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
