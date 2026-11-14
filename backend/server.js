const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

const normalizeOrigin = (origin) => origin.trim().replace(/\/+$/, '');

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/prices');
const packageRoutes = require('./routes/packages');
const clientRoutes = require('./routes/clients');
const billRoutes = require('./routes/bills');
const dateRoutes = require('./routes/dates');
const enquiryRoutes = require('./routes/enquiries');

app.use('/api/auth', authRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/dates', dateRoutes);
app.use('/api/team', require('./routes/team'));
app.use('/api/enquiries', enquiryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'PhotoFinder Billing API running' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.warn('\n⚠️ MongoDB Atlas connection failed (likely IP whitelist needed in Atlas):');
    console.warn(`   Reason: ${err.message}`);
    console.warn('👉 Tip: Go to cloud.mongodb.com -> Network Access -> Add IP Address (0.0.0.0/0 or your current IP).\n');
    console.log('🔄 Starting fallback local in-memory MongoDB database so the app works immediately...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      await mongoose.connect(memUri);
      console.log('✅ Connected to local fallback database (Memory DB)');
    } catch (memErr) {
      console.error('❌ Failed to start fallback DB:', memErr.message);
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();
