const News = require('../models/News');
const User = require('../models/User');
const axios = require('axios'); 
const mongoose = require('mongoose');
 

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const stopword = require('stopword'); 
const userProfileCache = new Map();
const recommendationCache = new Map();
const stopWords = new Set([
  'the', 'and', 'a', 'an', 'in', 'on', 'to', 'of', 'for', 'with', 'is', 'are', 'was', 'were',
  'it', 'this', 'that', 'they', 'we', 'you', 'he', 'she', 'his', 'her', 'their', 'our', 'my'
]);


function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g);
  if (!words) return [];
  const filtered = stopword.removeStopwords(words).filter(word => /^[a-z]+$/i.test(word));
  const unique = [...new Set(filtered)];
  return unique.slice(0, 5);
}


function cleanAndExtractText(text) {
  let cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.toLowerCase().startsWith('bst')) {
    cleaned = cleaned.slice(3);
  }
  cleaned = cleaned
    .replace(/^[\d\w\s,.:;%\-]+?(?=\s?[A-Z])/g, '')
    .replace(/([a-zA-Z])([\.!?])([A-Za-z])/g, '$1$2 $3')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2') 
    .replace(/\s+/g, ' ') 
    .trim();

  return cleaned;
}


async function processArticle(article) {
  try {
    const response = await fetch(article.webUrl, { timeout: 10000 });
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $('img').first().attr('src') ||
                     $('.article-body img').first().attr('src') ||
                     null;
    const fullText = $('.article-body__content')
      .text()
      .trim() || $('.article__container')
      .text()
      .trim() || $('article')
      .text()
      .trim() || $('body')
      .text()
      .slice(0, 2000)
      .trim();
    const cleanedFullText = cleanAndExtractText(fullText);
    const shortDescription = cleanedFullText.slice(0, 200);
    const keywords = extractKeywords(article.webTitle + ' ' + fullText);
    return {
      title: article.webTitle,
      description: shortDescription || '',
      url: article.webUrl,
      imageUrl,
      source: article.sectionId || 'unknown',
      publishedAt: article.webPublicationDate,
      categories: [article.sectionId || 'other'],
      tags: keywords
    };
  } catch (err) {
    console.error(`Ошибка парсинга ${article.webUrl}:`, err.message);
    return {
      title: article.webTitle,
      description: '',
      url: article.webUrl,
      imageUrl: null,
      source: article.sectionId || 'unknown',
      publishedAt: article.webPublicationDate,
      categories: [article.sectionId || 'other'],
      tags: []
    };
  }
}


exports.getAllNews = async (req, res) => {
  const {category, from, to, page = 1, maxPerPage = 9
} = req.query;
  console.log('Полученные параметры:', { category, from, to, page, maxPerPage });
  if (!process.env.GUARDIAN_API_KEY) {
    return res.status(500).json({ error: 'GUARDIAN_API_KEY не настроен' });
  }
  try {
    const params = {
      'api-key': process.env.GUARDIAN_API_KEY,
      'page-size': parseInt(maxPerPage),
      'page': parseInt(page)
    };
    if (category) params.section = category;
    if (from) params['from-date'] = from;
    if (to) params['to-date'] = to;
    console.log('Параметры для запроса к The Guardian:', params);
    const response = await axios.get('https://content.guardianapis.com/search ', { params });
    const articles = response.data.response.results;
    const CONCURRENCY_LIMIT = 10; 
    const batches = [];
    for (let i = 0; i < articles.length; i += CONCURRENCY_LIMIT) {
      const batch = articles.slice(i, i + CONCURRENCY_LIMIT);
      const promises = batch.map(processArticle);
      batches.push(...await Promise.all(promises));
    }
    const formattedArticles = batches;
    res.json({
      status: 'ok',
      totalResults: response.data.response.total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(response.data.response.total / maxPerPage),
      articles: formattedArticles
    });
  } catch (error) {
    console.error('Ошибка при получении новостей:', error.message);
    res.status(500).json({ error: 'Не удалось загрузить новости' });
  }
};


exports.searchNewsByQuery = async (req, res) => {
  const {
    q,
    category,
    from,
    to,
    page = 1,
    maxPerPage = 6
  } = req.query;
  console.log('Параметры для поиска:', { q, category, from, to, page, maxPerPage });
  if (!process.env.GUARDIAN_API_KEY) {
    return res.status(500).json({ error: 'GUARDIAN_API_KEY не настроен' });
  }
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Необходим параметр q для поиска' });
  }
  try {
    const params = {
      'api-key': process.env.GUARDIAN_API_KEY,
      'page-size': parseInt(maxPerPage),
      'page': parseInt(page),
      'q': q
    };
    if (category) params.section = category;
    if (from) params['from-date'] = from;
    if (to) params['to-date'] = to;
    console.log('Параметры для Guardian Search API:', params);
    const response = await axios.get('https://content.guardianapis.com/search ', { params });
    const articles = response.data.response.results || [];
    const CONCURRENCY_LIMIT = 10;
    const batches = [];

    for (let i = 0; i < articles.length; i += CONCURRENCY_LIMIT) {
      const batch = articles.slice(i, i + CONCURRENCY_LIMIT);
      const promises = batch.map(processArticle);
      batches.push(...await Promise.all(promises));
    }

    const formattedArticles = batches;

    res.json({
      status: 'ok',
      currentPage: parseInt(page),
      totalPages: Math.ceil(response.data.response.total / maxPerPage),
      totalResults: response.data.response.total,
      articles: formattedArticles
    });

  } catch (error) {
    console.error('Ошибка при поиске новостей:', error.message);
    res.status(500).json({ error: 'Не удалось выполнить поиск' });
  }
};


function clearUserProfileCache(userId) {
  const keysToDelete = [];
  for (const [key] of userProfileCache) {
    if (key.startsWith(`profile-${userId}-`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => userProfileCache.delete(key));
}


exports.addToJournal = async (req, res) => {
  try {
    const {
      userId,
      url,
      source = 'unknown',
      title = 'Без названия',
      description = 'Описание отсутствует',
      content = '',
      imageUrl = '',
      publishedAt = new Date(),
      author = '',
      keywords = [],
      categories = ['general']
    } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }
    if (!url) {
      return res.status(400).json({ message: 'URL обязателен' });
    }
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const existingEntry = await News.findOne({ userId, url });
    if (existingEntry) {
      return res.status(409).json({
        message: 'Новость уже в журнале',
        entry: existingEntry
      });
    }
    const newEntry = new News({
      userId,
      url,
      source,
      title,
      description,
      content: content || description,
      imageUrl,
      publishedAt,
      author,
      keywords,
      categories,
      isFavorite: false
    });
    const savedEntry = await newEntry.save();
    await User.findByIdAndUpdate(
      userId,
      { $push: { journalEntries: savedEntry._id } },
      { new: true }
    );
    clearUserProfileCache(userId);
    clearRecommendationCache(userId);
    return res.status(201).json({
      message: 'Новость успешно добавлена в журнал',
      entry: savedEntry
    });
  } catch (err) {
    console.error('Ошибка сохранения в журнал:', {
      error: err,
      receivedData: req.body
    });
    return res.status(500).json({
      message: 'Ошибка сервера при сохранении новости',
      error: err.message
    });
  }
};


exports.deleteFromJournal = async (req, res) => {
  const { entryId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(entryId)) {
    return res.status(400).json({ 
      message: 'Invalid entry ID format',
      receivedId: entryId
    });
  }
  try {
    const entry = await News.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }
    await News.deleteOne({ _id: entryId });
    await User.updateOne(
      { _id: entry.userId },
      { $pull: { journalEntries: entryId } }
    );
    clearUserProfileCache(entry.userId);
    clearRecommendationCache(entry.userId);
    res.json({ 
      success: true,
      message: 'Entry deleted successfully',
      deletedEntry: entryId
    });
  } catch (err) {
    console.error('Delete error:', {
      error: err.message,
      stack: err.stack,
      entryId
    });
    res.status(500).json({ 
      message: 'Failed to delete entry',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

function clearRecommendationCache(userId) {
  const keysToDelete = [];
  for (const [key] of recommendationCache) {
    if (key.startsWith(`${userId}-`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => recommendationCache.delete(key));
}


exports.getUserJournal = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }
    clearUserProfileCache(userId);
    const entries = await News.find({ userId })
      .sort({ publishedAt: -1 })
      .lean();
    if (!entries || entries.length === 0) {
      return res.status(200).json([]);
    }
    res.status(200).json(entries);
  } catch (err) {
    console.error('Ошибка получения журнала:', err);
    res.status(500).json({ 
      message: 'Ошибка при получении журнала',
      error: err.message 
    });
  }
};


function analyzeUserInterests(journalEntries) {
  const wordFrequency = {};
  for (const entry of journalEntries) {
    const titleWords = extractKeywords(entry.title || '');
    const descriptionWords = extractKeywords(entry.description || '');
    for (const word of titleWords) {
      if (!stopWords.has(word.toLowerCase())) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 2;
      }
    }
    for (const word of descriptionWords) {
      if (!stopWords.has(word.toLowerCase())) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    }
  }
  const sortedWords = Object.entries(wordFrequency)
    .filter(([word]) => word.length > 2)
    .sort((a, b) => b[1] - a[1]);

  return sortedWords.map(([word]) => word);
}


exports.getRecommendations = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, maxPerPage = 6 } = req.query;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Неверный ID пользователя' });
  }
  try {
    const journalEntries = await News.find({ userId }).lean();
    if (!journalEntries.length) {
      return res.json({
        status: 'ok',
        currentPage: parseInt(page),
        totalPages: 0,
        totalResults: 0,
        recommendations: []
      });
    }
    const topKeywords = analyzeUserInterests(journalEntries);
    const searchQuery = topKeywords.length > 0
      ? topKeywords.slice(0, Math.min(5, topKeywords.length)).join(' OR ')
      : 'technology business science sports'; // fallback
    const guardianResponse = await axios.get('https://content.guardianapis.com/search ', {
      params: {
        'api-key': process.env.GUARDIAN_API_KEY,
        q: searchQuery,
        page: parseInt(page),
        'page-size': parseInt(maxPerPage)
      }
    });
    const rawArticles = guardianResponse.data.response?.results || [];
    const CONCURRENCY_LIMIT = 10;
    const processed = [];
    for (let i = 0; i < rawArticles.length; i += CONCURRENCY_LIMIT) {
      const batch = rawArticles.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.all(batch.map(processArticle));
      processed.push(...results);
    }
    shuffleArray(processed);

    const totalResults = guardianResponse.data.response?.total || processed.length;
    const totalPages = Math.ceil(totalResults / maxPerPage);

    return res.json({
      status: 'ok',
      currentPage: parseInt(page),
      totalPages,
      totalResults,
      recommendations: processed
    });

  } catch (err) {
    console.error('Ошибка при генерации рекомендаций:', err.message);
    return res.status(500).json({ error: 'Не удалось получить рекомендации' });
  }
};


function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


exports.strictSearchNews = async (req, res) => {
  const { q, page = 1, maxPerPage = 6 } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Необходим параметр q для поиска' });
  }
  try {
    const extendedQuery = `${q} OR ${q}+movie OR ${q}+game OR ${q}+block`;
    const guardianResponse = await axios.get('https://content.guardianapis.com/search ', {
      params: {
        'api-key': process.env.GUARDIAN_API_KEY,
        q: extendedQuery,
        'page-size': parseInt(maxPerPage),
        'page': parseInt(page)
      }
    });
    const rawArticles = guardianResponse.data.response?.results || [];
    const CONCURRENCY_LIMIT = 10;
    const batches = [];
    for (let i = 0; i < rawArticles.length; i += CONCURRENCY_LIMIT) {
      const batch = rawArticles.slice(i, i + CONCURRENCY_LIMIT);
      const promises = batch.map(processArticle);
      batches.push(...await Promise.all(promises));
    }
    const formattedArticles = batches;
    const totalResults = guardianResponse.data.response.total;
    const totalPages = Math.ceil(totalResults / maxPerPage);

    return res.json({
      status: 'ok',
      currentPage: parseInt(page),
      totalPages,
      totalResults,
      articles: formattedArticles
    });

  } catch (err) {
    console.error('Ошибка строгого поиска:', err.message);
    return res.status(500).json({ error: 'Не удалось выполнить строгий поиск' });
  }
};
