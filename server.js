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

const allowedOrigins = [
  'https://recipe-app-lake-alpha.vercel.app',
  'http://localhost:3000', // for development
  'http://localhost:5173'  // for development
];

// --- Security & parsing hardening ---
app.disable('x-powered-by');
app.use(helmet());
app.use(hpp());
app.use(mongoSanitize());            // strips $ and . from keys (NoSQL injection)
app.use(express.json({ limit: '100kb' })); // avoid huge payloads
app.use(cookieParser());


// Simplified CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Log blocked origins for debugging
    console.log('Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204
}));

app.options("*", cors());
// --- Rate limiting ---
// Global, reasonable baseline
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",  // <-- important
});
app.use(apiLimiter);

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",  // <-- important
});
app.use("/api/auth", authLimiter);


app.use((req, _res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} (Origin: ${req.headers.origin || "n/a"})`);
  next();
});

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
