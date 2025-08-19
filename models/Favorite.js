import mongoose from 'mongoose'

const FavoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipeId: { type: String, required: true },
  name: { type: String, required: true },
  thumbnail: { type: String, required: true }
})

export default mongoose.model('Favorite', FavoriteSchema)
