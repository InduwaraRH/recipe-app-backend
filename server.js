import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import recipeRoutes from './routes/recipes.js';
import favoriteRoutes from './routes/favorites.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();
await connectDB();

const app = express();

// --- Security & parsing hardening ---
app.disable('x-powered-by');
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// --- CORS (normalize both sides, allow credentials, handle preflights) ---
const ALLOWED_ORIGINS = [
  (process.env.CLIENT_URL || '').replace(/\/$/, ''), // strip trailing slash from env
  // add more origins if needed
];

const corsOptions = {
  origin(origin, cb) {
    // allow non-browser clients with no Origin header
    if (!origin) return cb(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (ALLOWED_ORIGINS.includes(normalized)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // make OPTIONS preflights succeed

// --- Rate limiting ---
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use('/api/auth', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
}));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/recipes', requireAuth, recipeRoutes);
app.use('/api/favorites', requireAuth, favoriteRoutes);

// Health check
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
