require("dotenv").config();
const mongoose = require("mongoose");
const Vendor = require("./models/Vendor");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("Connected ✅");

  await Vendor.deleteMany({}); // clear old

  await Vendor.insertMany([
    { vendorId: "101", name: "Vendor A" },
    { vendorId: "102", name: "Vendor B" },
    { vendorId: "103", name: "Vendor C" }
  ]);

  console.log("✅ Vendors seeded");
  process.exit();
}

seed();
