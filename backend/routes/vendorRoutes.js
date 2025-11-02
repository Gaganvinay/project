const express = require("express");
const Vendor = require("../models/Vendor");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const vendors = await Vendor.find().lean();
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
