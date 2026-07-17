import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import milkEntryRoutes from './routes/milkEntryRoutes.js';
import rateChartRoutes from './routes/rateChartRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();
connectDB();

const app = express();
app.set('trust proxy', 1); // required on Render for rate-limit & secure cookies

// Secure headers (CORS-safe so the Vercel frontend is not blocked)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Explicit CORS whitelist with credentials for httpOnly cookies
const allowedOrigins = (process.env.CLIENT_URLS || 'http://localhost:3000').split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Blocked by CORS')),
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // NoSQL injection protection

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/milk-entries', milkEntryRoutes);
app.use('/api/rate-chart', rateChartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.send('Dairy Hisab-Kitab API is running'));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`));
