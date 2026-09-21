const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware — allow any localhost origin in development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost / 127.0.0.1 port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Routes
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const cloneRoutes = require('./routes/clone.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const recycleBinRoutes = require('./routes/recycleBin.routes');
const deviceRoutes = require('./routes/device.routes');

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/clone', cloneRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);
app.use('/api/devices', deviceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI DB Cloning System is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected Successfully');

    // ── Startup recovery: resume any jobs left in 'running' state ──
    try {
      const CloneJob = require('./models/CloneJob');
      const { processChunks } = require('./services/clone.service');
      const stuckJobs = await CloneJob.find({ status: 'running' });
      if (stuckJobs.length > 0) {
        console.log(`🔄 Resuming ${stuckJobs.length} running job(s) from previous session...`);
        stuckJobs.forEach(job => processChunks(job._id));
      }
    } catch (e) {
      console.warn('⚠️  Could not resume stuck jobs:', e.message);
    }

    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

module.exports = app;
