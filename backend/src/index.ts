import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { productRoutes } from './routes/productRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { paymentRoutes } from './routes/paymentRoutes.js';
import { authRoutes } from './routes/authRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { storeRoutes } from './routes/storeRoutes.js';
import { superadminRoutes } from './routes/superadminRoutes.js';
import { uploadRoutes } from './routes/uploadRoutes.js';
import { customerRoutes } from './routes/customerRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/customers', customerRoutes);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
