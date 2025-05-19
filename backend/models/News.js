const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  url: {type: String, required: true, unique: true},
  source: {type: String, required: true, default: 'unknown'},
  title: {type: String, required: true, default: 'Без названия'},
  description: {type: String, default: 'Описание отсутствует'},
  content: {type: String, default: ''},
  imageUrl: {type: String, default: ''},
  publishedAt: {type: Date, default: Date.now},
  author: {type: String, default: ''},
  keywords: {type: [String], default: []},
  categories: {type: [String], default: ['general']},
  isFavorite: {type: Boolean, default: false}
}, 

{
  timestamps: true,
  versionKey: false
});

module.exports = mongoose.model('News', NewsSchema);