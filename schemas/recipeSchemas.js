// schemas/recipeSchemas.js
import { z } from 'zod';
import mongoose from 'mongoose';

// (these might already exist in your file)
export const objectId = z.string().refine(
  (v) => mongoose.isValidObjectId(v),
  { message: 'Invalid ObjectId' }
);

export const createRecipeSchema = z.object({
  title: z.string().min(1).max(120),
  ingredients: z.array(z.string().min(1)).min(1),
  steps: z.array(z.string().min(1)).min(1)
});

export const updateRecipeSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  ingredients: z.array(z.string().min(1)).min(1).optional(),
  steps: z.array(z.string().min(1)).min(1).optional()
});

export const recipeIdParams = z.object({ id: objectId });

export const categoryQuery = z.object({
  category: z.string().min(1, 'category is required').max(50)
});

export const mealIdParams = z.object({
  id: z.string().regex(/^\d+$/, 'id must be numeric')
});
