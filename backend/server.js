require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// routers
const uploadRouter = require('./routes/upload');
const eventsRouter = require('./routes/events');
const mlRouter = require('./routes/ml');
const analyticsRouter = require("./routes/analytics");
const vendorRoutes=require("./routes/vendorRoutes");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use("/api/analytics", analyticsRouter);
app.use("/api/vendors",vendorRoutes);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vendorbgac';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('Mongo connected'))
  .catch(err => console.error('Mongo connection error', err));

// routes
app.use('/api/upload', uploadRouter);
app.use('/api/events', eventsRouter);
app.use('/api/ml', mlRouter);

app.get('/', (req, res) => res.send('VendorBGAC Backend API'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`Backend server running on port ${PORT}`));
