// routes/recipes.js
import express from 'express';
import axios from 'axios';
import { validate } from '../middleware/validate.js';
import { categoryQuery, mealIdParams } from '../schemas/recipeSchemas.js';

const router = express.Router();

const api = axios.create({
  baseURL: 'https://www.themealdb.com/api/json/v1/1',
  timeout: 8000
});

// GET /api/recipes/categories
router.get('/categories', async (_req, res) => {
  try {
    const { data } = await api.get('/categories.php');
    return res.json(data?.categories ?? []);
  } catch {
    return res.status(502).json({ message: 'Error fetching categories' });
  }
});

// GET /api/recipes?category=Beef
router.get(
  '/',
  validate({ query: categoryQuery }),
  async (req, res) => {
    try {
      const { category } = req.query;
      const { data } = await api.get('/filter.php', { params: { c: category } });
      if (!data?.meals) return res.status(404).json({ message: 'No meals found for this category' });
      return res.json(data.meals);
    } catch {
      return res.status(502).json({ message: 'Error fetching meals' });
    }
  }
);

// GET /api/recipes/:id
router.get(
  '/:id',
  validate({ params: mealIdParams }),
  async (req, res) => {
    try {
      const { data } = await api.get('/lookup.php', { params: { i: req.params.id } });
      if (!data?.meals?.length) return res.status(404).json({ message: 'Meal not found' });
      return res.json(data.meals[0]); // normalize to a single object
    } catch {
      return res.status(502).json({ message: 'Error fetching meal details' });
    }
  }
);

export default router;
