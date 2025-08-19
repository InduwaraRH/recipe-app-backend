import express from 'express'
import { body, validationResult } from 'express-validator'
import Favorite from '../models/Favorite.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

router.get('/', auth, async (req, res) => {
  const favs = await Favorite.find({ user: req.user.id })
  res.json(favs)
})

router.post('/', auth, [
  body('recipeId').notEmpty(),
  body('name').notEmpty(),
  body('thumbnail').notEmpty()
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
  const fav = new Favorite({ user: req.user.id, ...req.body })
  await fav.save()
  res.json(fav)
})

router.delete('/:id', auth, async (req, res) => {
  await Favorite.deleteOne({ _id: req.params.id, user: req.user.id })
  res.json({ success: true })
})

export default router
