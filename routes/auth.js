import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'

const router = express.Router()

router.post('/register', [
  body('email').isEmail(),
  body('password')
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
      message: 'Password must contain at least 6 characters with letters, numbers, and special characters'
    })
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const { email, password } = req.body
  try {
    let user = await User.findOne({ email })
    if (user) return res.status(400).json({ message: 'User already exists' })
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    user = new User({ email, password: hash })
    await user.save()
    const payload = { user: { id: user.id } }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' })
    res.json({ user: { id: user.id, email: user.email } })
  } catch (err) {
    res.status(500).send('Server error')
  }
})

router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ message: 'Invalid credentials' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' })
    const payload = { user: { id: user.id } }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' })
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' })
    res.json({ user: { id: user.id, email: user.email } })
  } catch (err) {
    res.status(500).send('Server error')
  }
})

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: 'Logged out' })
})

router.get('/me', (req, res) => {
  const token = req.cookies.token
  if (!token) return res.json({ user: null })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    res.json({ user: { id: decoded.user.id } })
  } catch {
    res.json({ user: null })
  }
})

export default router
