const News = require('../models/News');
const User = require('../models/User'); // Модель User
const axios = require('axios'); 
const mongoose = require('mongoose');
 
exports.deleteNews = async (req, res) => {
  const { id } = req.params;

  try {
    await News.findByIdAndDelete(id);
    res.json({ message: 'Новость удалена' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении' });
  }
};


exports.addToJournal = async (req, res) => {
  try {
    console.log('Полученные данные:', JSON.stringify(req.body, null, 2));

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
      sentiment: analyzeSentiment(title + ' ' + description),
      isFavorite: false
    });
    const savedEntry = await newEntry.save();
    await User.findByIdAndUpdate(
      userId,
      { $push: { journalEntries: savedEntry._id } }
    );
    console.log('Сохранённая запись:', JSON.stringify(savedEntry, null, 2));
    return res.status(201).json({
      message: 'Новость успешно добавлена',
      entry: savedEntry
    });

  } catch (err) {
    console.error('Ошибка сохранения:', {
      error: err,
      receivedData: req.body
    });
    
    return res.status(500).json({ 
      message: 'Ошибка сервера',
      error: err.message
    });
  }
};

exports.getUserJournal = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

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

exports.updateJournalEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const updates = req.body;

    const updatedEntry = await News.findByIdAndUpdate(
      entryId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Запись не найдена' });
    }

    res.json({
      message: 'Запись успешно обновлена',
      entry: updatedEntry
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Ошибка при обновлении',
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
    // Find the entry first
    const entry = await News.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Perform operations without transaction
    await News.deleteOne({ _id: entryId });
    await User.updateOne(
      { _id: entry.userId },
      { $pull: { journalEntries: entryId } }
    );

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


exports.proxyGNewsAPI = async (req, res) => {
  try {
    const {
      country = 'us',
      lang = 'en',
      category,
      query,
      max = 10
    } = req.query;
    if (!process.env.GNEWS_API_KEY) {
      return res.status(500).json({error: 'Ошибка сервера', details: 'GNEWS_API_KEY не настроен'});
    }
    const params = { token: process.env.GNEWS_API_KEY, country, lang, max};
    if (category) params.category = category;
    if (query) params.q = query;
    const response = await axios.get('https://gnews.io/api/v4/top-headlines ', {params, timeout: 10000}
    );
    const formattedArticles = response.data.articles.map(article => ({
      source: {
        id: article.source?.name.toLowerCase().replace(/\s+/g, '-'),
        name: article.source?.name
      },
      author: article.author || 'Unknown',
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.image,
      publishedAt: article.publishedAt,
      content: article.content
    }));
    res.json({
      status: "ok",
      totalResults: response.data.totalArticles,
      articles: formattedArticles
    });

  } catch (error) {
    console.error('GNews API error:', {
      message: error.message,
      config: error.config,
      response: error.response?.data
    });

    const statusCode = error.response?.status || 500;
    const errorData = {
      error: 'Failed to fetch from GNews API',
      details: error.message
    };

    if (error.response?.data) {
      errorData.apiError = error.response.data;
    }

    res.status(statusCode).json(errorData);
  }
};

const natural = require('natural');
const { SentimentAnalyzer } = require('natural');
const { WordTokenizer } = natural;
const tokenizer = new WordTokenizer();

// Кэш для хранения результатов запросов к NewsAPI
const recommendationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

exports.getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      version = 0,
      page = 1, // Добавляем параметр страницы
      limit = 6, // Лимит на страницу
      likedKeywords = '',
      dislikedKeywords = '',
      preferredCategories = ''
    } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    // 1. Получаем журнал пользователя
    const userNews = await News.find({ userId })
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean();

    // 2. Анализируем предпочтения
    const preferences = buildUserPreferences(
      userNews,
      likedKeywords.split(',').filter(Boolean),
      dislikedKeywords.split(',').filter(Boolean),
      preferredCategories.split(',').filter(Boolean)
    );

    // 3. Генерируем ключ кэша с учетом пагинации
    const cacheKey = generateCacheKey(userId, version, preferences, pageNumber, limitNumber);

    // Проверяем кэш
    if (recommendationCache.has(cacheKey)) {
      const { timestamp, data } = recommendationCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        return res.status(200).json({
          recommendations: data.recommendations,
          totalCount: data.totalCount,
          currentPage: pageNumber,
          totalPages: Math.ceil(data.totalCount / limitNumber)
        });
      }
    }

    // 4. Получаем рекомендации (больше, чем лимит, чтобы учесть фильтрацию)
    let recommendations = await fetchPersonalizedRecommendations(preferences, limitNumber * 3, version);

    // 5. Фильтруем уже сохраненные новости
    recommendations = recommendations.filter(recommendation => 
      !userNews.some(item => item.url === recommendation.url)
    );

    // 6. Если рекомендаций мало, добавляем fallback
    if (recommendations.length < limitNumber * 3) {
      const fallbackCount = limitNumber * 3 - recommendations.length;
      const fallbackNews = await fetchFallbackRecommendations(fallbackCount, version);
      recommendations.push(...fallbackNews);
    }

    // Сохраняем общее количество для пагинации
    const totalCount = recommendations.length;

    // Применяем пагинацию
    const paginatedRecommendations = recommendations.slice(skip, skip + limitNumber);

    // Сохраняем в кэш
    recommendationCache.set(cacheKey, {
      timestamp: Date.now(),
      data: {
        recommendations: paginatedRecommendations,
        totalCount
      }
    });

    res.status(200).json({
      recommendations: paginatedRecommendations,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber)
    });
  } catch (err) {
    console.error('Ошибка получения рекомендаций:', err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message 
    });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      version = 0,
      limit = 12, // Увеличиваем лимит
      likedKeywords = '',
      dislikedKeywords = '',
      preferredCategories = ''
    } = req.query;

    // 1. Получаем журнал пользователя
    const userNews = await News.find({ userId })
      .sort({ publishedAt: -1 })
      .limit(50)
      .lean();

    // 2. Анализируем предпочтения
    const preferences = buildUserPreferences(
      userNews,
      likedKeywords.split(',').filter(Boolean),
      dislikedKeywords.split(',').filter(Boolean),
      preferredCategories.split(',').filter(Boolean)
    );

    // 3. Получаем больше рекомендаций
    let recommendations = await fetchPersonalizedRecommendations(preferences, limit * 3, version);

    // 4. Фильтруем уже сохраненные новости
    recommendations = recommendations.filter(recommendation => 
      !userNews.some(item => item.url === recommendation.url)
    );

    // 5. Если рекомендаций мало, добавляем fallback
    if (recommendations.length < limit) {
      const fallbackCount = limit * 2 - recommendations.length;
      const fallbackNews = await fetchFallbackRecommendations(fallbackCount, version);
      recommendations = [...recommendations, ...fallbackNews];
      
      // Удаляем дубликаты
      recommendations = recommendations.filter((item, index, self) =>
        index === self.findIndex(t => t.url === item.url)
      );
    }

    // 6. Возвращаем запрошенное количество новостей
    const result = recommendations.slice(0, limit);

    res.status(200).json({
      recommendations: result,
      totalCount: result.length
    });
  } catch (err) {
    console.error('Ошибка получения рекомендаций:', err);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: err.message 
    });
  }
};

// Обновляем генерацию ключа кэша
function generateCacheKey(userId, version, preferences, page, limit) {
  return `${userId}-${version}-${page}-${limit}-${preferences.keywords.join(',')}-${preferences.categories.join(',')}`;
}

// Построение профиля предпочтений
function buildUserPreferences(userNews, explicitLikes = [], explicitDislikes = [], explicitCategories = []) {
  const keywordWeights = {};
  const sourceWeights = {};
  const categoryWeights = {};
  const sentimentScores = { positive: 0, negative: 0, neutral: 0 };
  const now = Date.now();

  // Анализ каждой новости с учетом времени
  userNews.forEach((newsItem, index) => {
    const timeDecay = 0.9 ** index; // Экспоненциальное затухание
    const recency = 1 / (1 + Math.log(1 + (now - new Date(newsItem.publishedAt).getTime()) / (1000 * 60 * 60 * 24)));
    const weight = timeDecay * recency;

    // Обработка ключевых слов
    const keywords = newsItem.keywords || extractKeywords(newsItem.title, newsItem.description);
    keywords.forEach(keyword => {
      if (explicitDislikes.includes(keyword)) return;
      const boost = explicitLikes.includes(keyword) ? 2 : 1;
      keywordWeights[keyword] = (keywordWeights[keyword] || 0) + weight * boost;
    });

    // Обработка категорий
    const categories = explicitCategories.length > 0 
      ? explicitCategories 
      : (newsItem.categories || categorizeContent(newsItem.title, newsItem.description));
    
    categories.forEach(category => {
      categoryWeights[category] = (categoryWeights[category] || 0) + weight;
    });

    // Анализ источников
    if (newsItem.source) {
      sourceWeights[newsItem.source] = (sourceWeights[newsItem.source] || 0) + weight;
    }

    // Анализ тональности
    const sentiment = analyzeSentiment(newsItem.title);
    sentimentScores[sentiment] += weight;
  });

  // Нормализация весов
  const normalize = weights => {
    const max = Math.max(...Object.values(weights));
    return Object.fromEntries(
      Object.entries(weights).map(([key, val]) => [key, val / max])
    );
  };

  return {
    keywords: getTopItems(keywordWeights, 15, 0.05),
    categories: getTopItems(categoryWeights, 5),
    sources: getTopItems(sourceWeights, 3),
    sentiment: Object.entries(sentimentScores).reduce((a, b) => a[1] > b[1] ? a : b)[0],
    dislikedKeywords: explicitDislikes
  };
}

// Получение топ-N элементов
function getTopItems(weights, count, threshold = 0.1) {
  return Object.entries(weights)
    .filter(([_, weight]) => weight >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([item]) => item);
}

// Получение персонализированных рекомендаций
async function fetchPersonalizedRecommendations(preferences, limit, version) {
  const { keywords, categories, sources, sentiment, dislikedKeywords } = preferences;
  const queryVariants = [];

  // Вариант 1: Основные ключевые слова + категории
  if (keywords.length > 0 && categories.length > 0) {
    queryVariants.push(`(${keywords.slice(0, 3).join(' OR ')}) AND (${categories[0]})`);
  }

  // Вариант 2: Ключевые слова + тональность
  if (keywords.length > 0 && sentiment !== 'neutral') {
    const sentimentWords = getSentimentWords(sentiment);
    queryVariants.push(`(${keywords[0]}) AND (${sentimentWords.join(' OR ')})`);
  }

  // Вариант 3: По источнику
  if (sources.length > 0) {
    queryVariants.push(`source:${sources[0]}`);
  }

  // Вариант 4: Случайная комбинация
  const randomCombination = [];
  if (keywords.length > 0) randomCombination.push(keywords[0]);
  if (categories.length > 0 && version % 2 === 0) randomCombination.push(categories[0]);
  if (randomCombination.length > 0) {
    queryVariants.push(randomCombination.join(' AND '));
  }

  // Если вариантов нет, используем fallback
  if (queryVariants.length === 0) {
    return fetchFallbackRecommendations(limit, version);
  }

  // Параллельный запрос всех вариантов
  const requests = queryVariants.map(query => 
    fetchNewsAPI(query, Math.ceil(limit / queryVariants.length), version)
  );

  const results = await Promise.all(requests);
  let recommendations = results.flat();

  // Фильтрация по dislikes
  if (dislikedKeywords.length > 0) {
    recommendations = recommendations.filter(item =>
      !dislikedKeywords.some(keyword =>
        item.title.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  // Рандомизация с учетом версии
  return shuffleArray(recommendations, version).slice(0, limit);
}

// Запрос к NewsAPI
async function fetchNewsAPI(query, limit, version) {
  try {
    const cacheKey = `newsapi-${query}-${limit}-${version}`;
    if (recommendationCache.has(cacheKey)) {
      return recommendationCache.get(cacheKey);
    }

    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        pageSize: limit,
        sortBy: version % 2 === 0 ? 'relevancy' : 'publishedAt',
        language: 'en',
        apiKey: process.env.NEWS_API_KEY
      }
    });

    const result = response.data.articles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      source: article.source?.name,
      publishedAt: article.publishedAt,
      relevance: calculateRelevance(article, query)
    }));

    recommendationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`NewsAPI error for query "${query}":`, error.message);
    return [];
  }
}

// Fallback-рекомендации
async function fetchFallbackRecommendations(limit, version) {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        country: 'us',
        pageSize: limit,
        apiKey: process.env.NEWS_API_KEY
      }
    });

    return shuffleArray(response.data.articles, version).map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      source: article.source?.name,
      publishedAt: article.publishedAt,
      relevance: 0.5 // Базовый уровень релевантности для fallback
    }));
  } catch (error) {
    console.error('Fallback recommendations error:', error.message);
    return [];
  }
}

// Вспомогательные функции

function extractKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const tokens = tokenizer.tokenize(text) || [];
  const stopwords = new Set(natural.stopwords);
  
  const keywords = tokens
    .filter(token => token.length > 3 && !stopwords.has(token))
    .filter(token => /^[a-z]+$/.test(token)); // Только слова из букв

  const tfidf = new natural.TfIdf();
  tfidf.addDocument(text);
  
  const keywordScores = {};
  tfidf.listTerms(0).forEach(item => {
    if (keywords.includes(item.term)) {
      keywordScores[item.term] = item.tfidf;
    }
  });

  return Object.keys(keywordScores)
    .sort((a, b) => keywordScores[b] - keywordScores[a])
    .slice(0, 5);
}

function categorizeContent(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const categories = [];

  if (/(tech|ai|robot|computer|software)/.test(text)) categories.push('technology');
  if (/(business|market|economy|stock)/.test(text)) categories.push('business');
  if (/(science|research|space|medicine)/.test(text)) categories.push('science');
  if (/(politics|government|election)/.test(text)) categories.push('politics');
  if (/(sport|football|basketball)/.test(text)) categories.push('sports');

  return categories.length > 0 ? categories : ['general'];
}

const analyzer = new SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');


function analyzeSentiment(text) {
  const score = analyzer.getSentiment(tokenizer.tokenize(text) || []);
  if (score > 0.2) return 'positive';
  if (score < -0.2) return 'negative';
  return 'neutral';
}

function getSentimentWords(sentiment) {
  return sentiment === 'positive'
    ? ['success', 'win', 'growth', 'happy', 'achievement']
    : ['crisis', 'war', 'conflict', 'problem', 'failure'];
}

function calculateRelevance(article, query) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\W+/);
  let score = 0;

  queryTerms.forEach(term => {
    if (text.includes(term)) {
      score += 1 / (1 + text.indexOf(term) / 100); // Более ранние вхождения важнее
    }
  });

  // Бонусы
  if (article.urlToImage) score += 0.3;
  if (new Date() - new Date(article.publishedAt) < 86400000) score += 0.2; // Новые статьи

  return Math.min(1, score);
}

function shuffleArray(array, seed) {
  // Детерминированный shuffle на основе seed
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}