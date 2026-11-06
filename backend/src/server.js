import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import User from './models/User.js';
import { seedDatabase } from './seed/seeder.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import partsRoutes from './routes/partsRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import repairJobsRoutes from './routes/repairJobsRoutes.js';
import purchaseRequestsRoutes from './routes/purchaseRequestsRoutes.js';
import suppliersRoutes from './routes/suppliersRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/repair-jobs', repairJobsRoutes);
app.use('/api/purchase-requests', purchaseRequestsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'WorkshopParts Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Demo reset/re-seed endpoint
app.post('/api/seed/reset', async (req, res, next) => {
  try {
    await seedDatabase();
    res.status(200).json({ success: true, message: 'Database reset and seeded with fresh demo data' });
  } catch (error) {
    next(error);
  }
});

// Serve frontend static build if dist exists, ensuring http://localhost:5001 works directly
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Friendly welcome page if dist is missing
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>WorkshopParts API Server</title></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
          <div style="text-align: center; max-width: 500px; padding: 2.5rem; background: #1e293b; border-radius: 1.25rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <div style="width: 50px; height: 50px; background: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; margin-bottom: 1rem;">WP</div>
            <h1 style="color: #ffffff; margin: 0 0 0.5rem; font-size: 1.5rem;">WorkshopParts Backend API</h1>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem;">Backend API server is live on port 5001.</p>
            <a href="http://localhost:3000" style="display: inline-block; padding: 0.75rem 1.75rem; background: #2563eb; color: white; text-decoration: none; border-radius: 0.75rem; font-weight: 600; font-size: 0.95rem;">Open Web Application UI &rarr;</a>
          </div>
        </body>
      </html>
    `);
  });
}

// Central error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    // Check if database needs initial seeding
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Bootstrap] No existing users found. Auto-seeding initial demo data...');
      await seedDatabase();
    }

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 WorkshopParts Backend API running on port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
