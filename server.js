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
app.use(mongoSanitize());            // strips $ and . from keys (NoSQL injection)
app.use(express.json({ limit: '100kb' })); // avoid huge payloads
app.use(cookieParser());

// CORS (restrict to your frontend; allow credentials if you use cookie auth)
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE']
}));

// --- Rate limiting ---
// Global, reasonable baseline
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));
// Tighter on auth endpoints
app.use('/api/auth', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
}));

// --- Routes ---
// Public auth routes (login/register/etc.)
app.use('/api/auth', authRoutes);

// Protected routes: require a valid JWT before reaching handlers
app.use('/api/recipes', requireAuth, recipeRoutes);
app.use('/api/favorites', requireAuth, favoriteRoutes);

// Health check (optional)
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Central error handler (keeps errors consistent)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
