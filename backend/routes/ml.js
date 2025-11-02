const express = require('express');
const axios = require('axios');
const router = express.Router();

const ML_URL = process.env.ML_URL || 'http://ml-service:8001';

router.post('/predict', async (req, res) => {
  try {
    const resp = await axios.post(`${ML_URL}/predict`, req.body);
    res.json(resp.data);
  } catch (err) {
    console.error('ML predict failed:', err.message);
    res.status(500).json({ error: 'ML predict failed' });
  }
});

router.post('/train', async (req, res) => {
  try {
    const resp = await axios.post(`${ML_URL}/train`, req.body);
    res.json(resp.data);
  } catch (err) {
    console.error('ML train failed:', err.message);
    res.status(500).json({ error: 'ML train failed' });
  }
});

router.get('/vendor_graph/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const resp = await axios.get(`${ML_URL}/vendor_graph/${vendorId}`);
    res.json(resp.data);
  } catch (err) {
    console.error('ML vendor_graph failed:', err.message);
    res.status(500).json({ error: 'ML vendor_graph failed' });
  }
});

module.exports = router;
