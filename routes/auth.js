import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// regex: min 6 chars, at least one letter, one number, one special char
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).+$/;


router.post(
  '/register',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(PASSWORD_REGEX)
      .withMessage('Password must include at least one letter, one number, and one special character'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = String(req.body.email).toLowerCase().trim();
    const { password } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: 'User already exists' });

      const hash = await bcrypt.hash(password, 10);
      user = new User({ email, password: hash });
      await user.save();

      // 🔒 Do NOT set auth cookie on register
      return res.status(201).json({
        message: 'Account created. Please log in.',
        user: { id: user.id, email: user.email },
      });
    } catch (err) {
      console.error('[REGISTER]', err);
      return res.status(500).send('Server error');
    }
  }
);


router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Please provide a valid email'),
    body('password').exists().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = String(req.body.email).toLowerCase().trim();
    const { password } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const payload = { user: { id: user.id } };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });


      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        partitioned: true, // requires cookie@>=0.6 / recent Express
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ user: { id: user.id, email: user.email } });
    } catch (err) {
      console.error('[LOGIN]', err);
      return res.status(500).send('Server error');
    }
  }
);


router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    partitioned: true,
    path: '/',
  });
  return res.json({ message: 'Logged out' });
});

router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ user: { id: decoded.user.id } });
  } catch {
    return res.json({ user: null });
  }
});

export default router;
