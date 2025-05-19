const News = require('../models/News');
const User = require('../models/User'); // Модель User
const axios = require('axios'); 
const mongoose = require('mongoose');
 

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stopword = require('stopword'); // имя переменной лучше не менять

// Кэши для ускорения работы
const recommendationCache = new Map();
const newsCache = new Map(); // <-- вот это мы добавили

/**
 * Вычисляет "релевантность" статьи к поисковому запросу
 * @param {string} text - полный текст статьи или заголовок
 * @param {string[]} keywords - список слов из запроса
 * @returns {number} оценка релевантности (чем больше — тем лучше)
 */
function calculateRelevance(text, keywords) {
  if (!text || !keywords.length) return 0;

  const lowerText = text.toLowerCase();
  let score = 0;

  for (const word of keywords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    const count = matches ? matches.length : 0;

    // Учитываем близость слов друг к другу
    const indices = [];
    let match;
    while ((match = regex.exec(lowerText)) !== null) {
      indices.push(match.index);
    }

    // Базовый бонус за наличие слова
    score += count * 10;

    // Если есть несколько слов рядом — добавляем бонус
    for (let i = 0; i < indices.length - 1; i++) {
      const distance = indices[i + 1] - indices[i];
      if (distance < 50) {
        score += 15; // слова рядом — это хорошо
      } else if (distance < 150) {
        score += 5;
      }
    }
  }

  return score;
}



/**
 * Извлекает ключевые слова из текста статьи
 * @param {string} text - заголовок + текст статьи
 * @returns {string[]} список тегов
 */
function extractKeywords(text) {
  if (!text) return [];

  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g);
  if (!words) return [];

  const filtered = stopword.removeStopwords(words).filter(word => /^[a-z]+$/i.test(word));
  const unique = [...new Set(filtered)];

  return unique.slice(0, 5);
}

// === Параллельная обработка одной статьи через node-fetch и cheerio ===
async function processArticle(article) {
  try {
    const response = await fetch(article.webUrl, { timeout: 10000 });
    const html = await response.text();
    const $ = cheerio.load(html);

    // Получаем главное изображение
    const imageUrl = $('img').first().attr('src') ||
                     $('.article-body img').first().attr('src') ||
                     null;

    // Парсим текст статьи
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

    // Обрезаем до 200 символов
    const shortDescription = fullText.replace(/\s+/g, ' ').slice(0, 200);

    // Извлекаем теги из заголовка + текста
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

// === getAllNews без Puppeteer ===
exports.getAllNews = async (req, res) => {
  const {
    category,
    from,
    to,
    page = 1,
    maxPerPage = 9
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

    // Параллелим обработку статей
    const CONCURRENCY_LIMIT = 10; // можно попробовать 5–15
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

// === searchNewsByQuery без Puppeteer ===
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

    // Параллелим обработку статей
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



// В начале файла, где объявлены кэши
const userProfileCache = new Map();

// Добавляем функцию для очистки кэша профиля пользователя
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

    // Валидация
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    if (!url) {
      return res.status(400).json({ message: 'URL обязателен' });
    }

    // Проверяем, существует ли пользователь
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем, есть ли такая запись
    const existingEntry = await News.findOne({ userId, url });
    if (existingEntry) {
      return res.status(409).json({
        message: 'Новость уже в журнале',
        entry: existingEntry
      });
    }

    // Создаём новую запись
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

    // Обновляем ссылки в профиле пользователя
    await User.findByIdAndUpdate(
      userId,
      { $push: { journalEntries: savedEntry._id } },
      { new: true }
    );

    // Очищаем кэш (если используется)
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

// Аналогично обновляем deleteFromJournal
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

    // Очищаем кэш профиля пользователя
    clearUserProfileCache(entry.userId);
    // Также очищаем кэш рекомендаций для этого пользователя
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

// Обновляем функцию getUserJournal для принудительного обновления кэша
exports.getUserJournal = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Неверный ID пользователя' });
    }

    // При запросе журнала также очищаем кэш профиля (опционально)
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


/**
 * Получает рекомендации для пользователя на основе его журнала
 */
exports.getRecommendations = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, maxPerPage = 6 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: 'Неверный ID пользователя' });
  }

  try {
    // Получаем журнал пользователя
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

    // Извлекаем ключевые слова из журнала
    const allKeywords = [];
    for (const entry of journalEntries) {
      const keywords = extractKeywords(entry.title + ' ' + entry.description);
      allKeywords.push(...keywords);
    }
    const uniqueKeywords = [...new Set(allKeywords)];

    // Фоллбэк, если нет тегов
    const searchQuery = uniqueKeywords.length > 0 ? uniqueKeywords.join(' OR ') : 'technology business science sports';

    // Запрашиваем статьи у Guardian
    const guardianResponse = await axios.get('https://content.guardianapis.com/search ', {
      params: {
        'api-key': process.env.GUARDIAN_API_KEY,
        q: searchQuery,
        page: parseInt(page),
        'page-size': parseInt(maxPerPage)
      }
    });

    const rawArticles = guardianResponse.data.response?.results || [];

    // Параллельная обработка статей
    const CONCURRENCY_LIMIT = 10;
    const processed = [];
    for (let i = 0; i < rawArticles.length; i += CONCURRENCY_LIMIT) {
      const batch = rawArticles.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.all(batch.map(processArticle));
      processed.push(...results);
    }

    // Поддержка пагинации
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

/**
 * Строгий поиск новостей — возвращает только точные совпадения
 */
/**
 * Строгий поиск новостей — возвращает точные совпадения и похожие темы
 */
exports.strictSearchNews = async (req, res) => {
  const { q, page = 1, maxPerPage = 6 } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Необходим параметр q для поиска' });
  }

  try {
    // Расширяем запрос, чтобы получить больше результатов
    const extendedQuery = `${q} OR ${q}+movie OR ${q}+game OR ${q}+block`;

    // Запрашиваем у Guardian с расширенным запросом
    const guardianResponse = await axios.get('https://content.guardianapis.com/search ', {
      params: {
        'api-key': process.env.GUARDIAN_API_KEY,
        q: extendedQuery,
        'page-size': parseInt(maxPerPage),
        'page': parseInt(page)
      }
    });

    const rawArticles = guardianResponse.data.response?.results || [];

    // Парсим каждую статью через cheerio
    const CONCURRENCY_LIMIT = 10;
    const batches = [];
    for (let i = 0; i < rawArticles.length; i += CONCURRENCY_LIMIT) {
      const batch = rawArticles.slice(i, i + CONCURRENCY_LIMIT);
      const promises = batch.map(processArticle);
      batches.push(...await Promise.all(promises));
    }

    const formattedArticles = batches;

    // Используем total из Guardian API
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



exports.deleteNews = async (req, res) => {
  const { id } = req.params;

  try {
    await News.findByIdAndDelete(id);
    res.json({ message: 'Новость удалена' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при удалении' });
  }
};

// exports.proxySearchNews = async (req, res) => {
//   const { q, lang = 'ru', after, pageSize = 10 } = req.query;

//   if (!process.env.GNEWS_API_KEY) {
//     return res.status(500).json({ error: 'API-ключ для GNews не задан' });
//   }

//   if (!q || q.trim().length < 3) {
//     return res.status(400).json({ error: 'Поисковый запрос должен содержать минимум 3 символа' });
//   }

//   try {
//     const params = {
//       q,
//       lang,
//       token: process.env.GNEWS_API_KEY,
//       max: Math.min(pageSize, 20), // Ограничиваем максимальный размер страницы
//     };

//     // Добавляем параметр сортировки по дате
//     params.sortby = 'publishedAt';

//     const response = await axios.get('https://gnews.io/api/v4/search', {
//       params,
//       timeout: 10000
//     });

//     let articles = response.data.articles || [];
    
//     // Сортировка по дате (на случай, если API не отсортировало)
//     articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

//     // Фильтрация по дате для пагинации
//     if (after) {
//       articles = articles.filter(article => new Date(article.publishedAt) < new Date(after));
//     }

//     // Ограничиваем количество возвращаемых статей
//     articles = articles.slice(0, pageSize);

//     // Форматируем ответ
//     const result = {
//       articles: articles.map(article => ({
//         title: article.title,
//         description: article.description,
//         content: article.content,
//         url: article.url,
//         image: article.image,
//         source: article.source?.name,
//         publishedAt: article.publishedAt,
//       })),
//       totalResults: response.data.totalArticles || 0,
//     };

//     res.json(result);
//   } catch (error) {
//     console.error('Ошибка при обращении к GNews:', {
//       message: error.message,
//       status: error.response?.status,
//       data: error.response?.data
//     });

//     if (error.code === 'ECONNABORTED') {
//       return res.status(504).json({ error: 'Превышено время ожидания ответа от GNews' });
//     }

//     if (error.response?.status === 429) {
//       return res.status(503).json({ 
//         error: 'Превышен лимит запросов к GNews API',
//         details: 'Бесплатная версия API ограничена 100 запросами в день'
//       });
//     }

//     res.status(500).json({ 
//       error: 'Ошибка при обращении к GNews API',
//       details: error.message
//     });
//   }
// };









// exports.proxyGNewsAPI = async (req, res) => {
//   try {
//     const {
//       country = 'us',
//       lang = 'en',
//       category,
//       query,
//       max = 10
//     } = req.query;
//     if (!process.env.GNEWS_API_KEY) {
//       return res.status(500).json({error: 'Ошибка сервера', details: 'GNEWS_API_KEY не настроен'});
//     }
//     const params = { token: process.env.GNEWS_API_KEY, country, lang, max};
//     if (category) params.category = category;
//     if (query) params.q = query;
//     const response = await axios.get('https://gnews.io/api/v4/top-headlines ', {params, timeout: 100000}
//     );
//     const formattedArticles = response.data.articles.map(article => ({
//       source: {
//         id: article.source?.name.toLowerCase().replace(/\s+/g, '-'),
//         name: article.source?.name
//       },
//       author: article.author || 'Unknown',
//       title: article.title,
//       description: article.description,
//       url: article.url,
//       urlToImage: article.image,
//       publishedAt: article.publishedAt,
//       content: article.content
//     }));
//     res.json({
//       status: "ok",
//       totalResults: response.data.totalArticles,
//       articles: formattedArticles
//     });

//   } catch (error) {
//     console.error('GNews API error:', {
//       message: error.message,
//       config: error.config,
//       response: error.response?.data
//     });

//     const statusCode = error.response?.status || 500;
//     const errorData = {
//       error: 'Failed to fetch from GNews API',
//       details: error.message
//     };

//     if (error.response?.data) {
//       errorData.apiError = error.response.data;
//     }

//     res.status(statusCode).json(errorData);
//   }
// };

// // Конфигурация
// const CACHE_TTL = 5 * 60 * 1000; // 5 минут
// const MAX_USER_HISTORY = 100;
// const RECOMMENDATION_POOL_SIZE = 100;
// const FALLBACK_STRATEGIES = ['headlines', 'trending', 'popular'];

// // Кэш для хранения результатов
// const recommendationCache = new Map();

// // Основная функция получения рекомендаций
// exports.getRecommendations = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const {
//       page = 1,
//       limit = 10, 
//       likedKeywords = '',
//       dislikedKeywords = '',
//       preferredCategories = '',
//       preferredSources = '',
//       freshness = 'week',
//       seed
//     } = req.query;

//     // Валидация параметров
//     const pageNumber = Math.max(1, parseInt(page));
//     const limitNumber = 10; // Всегда возвращаем 10 рекомендаций
//     const skip = (pageNumber - 1) * limitNumber;

//     // 1. Получаем профиль пользователя
//     const userProfile = await getUserProfile(
//       userId,
//       likedKeywords.split(',').filter(Boolean),
//       dislikedKeywords.split(',').filter(Boolean),
//       preferredCategories.split(',').filter(Boolean),
//       preferredSources.split(',').filter(Boolean)
//     );

//     // 2. Генерируем ключ кэша
//     const cacheKey = generateCacheKey(userId, userProfile, pageNumber, limitNumber, freshness, seed);

//     // Проверка кэша
//     if (recommendationCache.has(cacheKey)) {
//       const { timestamp, data } = recommendationCache.get(cacheKey);
//       if (Date.now() - timestamp < CACHE_TTL) {
//         // Гарантируем, что возвращается ровно 10 рекомендаций
//         const exact10 = data.recommendations.slice(0, 10);
//         return formatResponse(res, exact10, data.totalCount, pageNumber, limitNumber);
//       }
//     }

//     // 3. Получаем персонализированные рекомендации
//     let recommendations = await fetchPersonalizedRecommendations(
//       userProfile,
//       RECOMMENDATION_POOL_SIZE,
//       freshness
//     );

//     // 4. Фильтрация и ранжирование
//     recommendations = await processRecommendations(recommendations, userProfile, userId);

//     // 5. Пагинация - берем ровно 10 рекомендаций
//     const totalCount = recommendations.length;
//     const exact10Recommendations = recommendations.slice(0, 10);

//     // 6. Обновление кэша
//     recommendationCache.set(cacheKey, {
//       timestamp: Date.now(),
//       data: {
//         recommendations: exact10Recommendations,
//         totalCount
//       }
//     });

//     return formatResponse(res, exact10Recommendations, totalCount, pageNumber, limitNumber);
//   } catch (err) {
//     console.error('Recommendation error:', err);
    
//     // Fallback: возвращаем ровно 10 рекомендаций из кэшированных топовых новостей
//     try {
//       const fallbackNews = await fetchFallbackRecommendations(10, 'week');
//       const exact10Fallback = fallbackNews.slice(0, 10);
//       return formatResponse(res, exact10Fallback, exact10Fallback.length, 1, 10);
//     } catch (fallbackError) {
//       console.error('Fallback also failed:', fallbackError);
//       return handleRecommendationError(res, err);
//     }
//   }
// };

// // Функция для получения топовых элементов
// function getTopItems(weights, count, threshold = 0.1) {
//   if (!weights || typeof weights !== 'object') {
//     return [];
//   }

//   return Object.entries(weights)
//     .filter(([_, weight]) => weight >= threshold)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, count)
//     .map(([item]) => item);
// }

// // Функция получения профиля пользователя
// async function getUserProfile(userId, likedKeywords = [], dislikedKeywords = [], preferredCategories = [], preferredSources = []) {
//   const cacheKey = `profile-${userId}-${likedKeywords.join(',')}-${dislikedKeywords.join(',')}`;
  
//   if (userProfileCache.has(cacheKey)) {
//     return userProfileCache.get(cacheKey);
//   }

//   // Получаем историю пользователя
//   const userNews = await News.find({ userId })
//     .sort({ publishedAt: -1 })
//     .limit(MAX_USER_HISTORY)
//     .lean();

//   // Анализируем предпочтения
//   const profile = analyzeUserBehavior(
//     userNews,
//     likedKeywords,
//     dislikedKeywords,
//     preferredCategories,
//     preferredSources
//   );

//   userProfileCache.set(cacheKey, profile);
//   return profile;
// }

// // Анализ поведения пользователя (без тональности)
// function analyzeUserBehavior(newsItems, explicitLikes = [], explicitDislikes = [], explicitCategories = [], explicitSources = []) {
//   const keywordWeights = {};
//   const sourceWeights = {};
//   const categoryWeights = {};
//   const authorWeights = {};
//   const now = Date.now();

//   // Временные коэффициенты
//   const HOUR = 3600000;
//   const DAY = 86400000;
//   const WEEK = 604800000;

//   newsItems.forEach((item, index) => {
//     // Временной коэффициент (экспоненциальное затухание + релевантность новизны)
//     const age = now - new Date(item.publishedAt).getTime();
//     const recency = age < HOUR ? 1.5 : 
//                    age < DAY ? 1.2 : 
//                    age < WEEK ? 1.0 : 0.7;
//     const timeDecay = Math.pow(0.95, index);
//     const weight = recency * timeDecay;

//     // Извлечение ключевых слов
//     const keywords = extractEnhancedKeywords(item.title, item.description);
    
//     // Обработка ключевых слов
//     keywords.forEach(keyword => {
//       if (explicitDislikes.includes(keyword)) return;
//       const boost = explicitLikes.includes(keyword) ? 3 : 1;
//       keywordWeights[keyword] = (keywordWeights[keyword] || 0) + weight * boost;
//     });

//     // Обработка категорий
//     const categories = explicitCategories.length > 0 
//       ? explicitCategories 
//       : categorizeContentEnhanced(item.title, item.description);
    
//     categories.forEach(category => {
//       categoryWeights[category] = (categoryWeights[category] || 0) + weight;
//     });

//     // Обработка источников
//     if (item.source) {
//       const sourceBoost = explicitSources.includes(item.source) ? 2 : 1;
//       sourceWeights[item.source] = (sourceWeights[item.source] || 0) + weight * sourceBoost;
//     }

//     // Обработка авторов (если есть)
//     if (item.author) {
//       authorWeights[item.author] = (authorWeights[item.author] || 0) + weight * 0.8;
//     }
//   });

//   // Нормализация и выбор топовых элементов
//   return {
//     keywords: getTopItems(keywordWeights, 10, 0.1),
//     categories: getTopItems(categoryWeights, 5),
//     sources: getTopItems(sourceWeights, 5),
//     authors: getTopItems(authorWeights, 3),
//     dislikedKeywords: explicitDislikes,
//     preferredSources: explicitSources,
//     freshness: calculateFreshnessPreference(newsItems)
//   };
// }

// // Извлечение ключевых слов
// function extractEnhancedKeywords(title, description, maxKeywords = 8) {
//   if (!title && !description) return [];
  
//   const text = `${title || ''} ${description || ''}`.toLowerCase();
//   const tokens = tokenizer.tokenize(text) || [];
//   const stopwords = new Set([...natural.stopwords, 'said', 'say', 'says', 'year', 'new']);
  
//   // Фильтрация и нормализация
//   const filtered = tokens
//     .filter(token => token.length > 2 && !stopwords.has(token))
//     .filter(token => /^[a-z]+$/.test(token));
  
//   // Использование TF-IDF и частотности
//   const tfidf = new natural.TfIdf();
//   tfidf.addDocument(filtered.join(' '));
  
//   const keywordScores = {};
//   const termFrequency = {};
  
//   filtered.forEach(token => {
//     termFrequency[token] = (termFrequency[token] || 0) + 1;
//   });
  
//   tfidf.listTerms(0).forEach(item => {
//     const tfidfScore = item.tfidf;
//     const freqScore = termFrequency[item.term] / filtered.length;
//     keywordScores[item.term] = 0.6 * tfidfScore + 0.4 * freqScore;
//   });
  
//   // Добавляем именованные сущности
//   const entities = extractNamedEntities(text);
//   entities.forEach(entity => {
//     keywordScores[entity] = (keywordScores[entity] || 0) + 0.5;
//   });
  
//   return Object.keys(keywordScores)
//     .sort((a, b) => keywordScores[b] - keywordScores[a])
//     .slice(0, maxKeywords);
// }

// // Извлечение именованных сущностей
// function extractNamedEntities(text) {
//   const entities = [];
//   const words = text.split(/\s+/);
  
//   // Простая эвристика для имен собственных
//   for (let i = 0; i < words.length; i++) {
//     const word = words[i];
//     if (word.length > 3 && word[0] === word[0].toUpperCase() && !word.includes("'")) {
//       // Проверяем следующее слово для составных имен
//       if (i < words.length - 1 && words[i+1][0] === words[i+1][0].toUpperCase()) {
//         entities.push(`${word} ${words[i+1]}`);
//         i++;
//       } else {
//         entities.push(word);
//       }
//     }
//   }
  
//   return entities;
// }

// // Категоризация контента
// function categorizeContentEnhanced(title, description) {
//   const text = `${title || ''} ${description || ''}`.toLowerCase();
//   const categories = [];
  
//   const categoryPatterns = {
//     technology: /(tech|ai|robot|computer|software|digital|vr|ar|blockchain|bitcoin|crypto|algorithm|app|device)/,
//     business: /(business|market|economy|stock|finance|invest|bank|trade|commerce|startup|venture)/,
//     science: /(science|research|space|medicine|discovery|scientist|physics|biology|chemistry|climate)/,
//     politics: /(politics|government|election|minister|president|congress|senate|vote|law|policy)/,
//     sports: /(sport|football|basketball|olympic|tournament|championship|game|match|player|coach)/,
//     entertainment: /(movie|film|actor|actress|celebrity|music|song|album|award|oscar|festival)/,
//     health: /(health|disease|hospital|doctor|patient|medical|vaccine|pandemic|treatment|therapy)/
//   };
  
//   for (const [category, pattern] of Object.entries(categoryPatterns)) {
//     if (pattern.test(text)) {
//       categories.push(category);
//     }
//   }
  
//   return categories.length > 0 ? categories : ['general'];
// }

// // Получение персонализированных рекомендаций
// async function fetchPersonalizedRecommendations(profile, limit, freshness = 'week') {
//   try {
//     const baseParams = {
//       max: limit,
//       lang: 'en',
//       country: 'us',
//       from: getFreshnessDate(freshness)
//     };

//     const queryVariants = buildQueryVariants(profile);
//     const requests = queryVariants.map(query => 
//       fetchWithRetry('https://gnews.io/api/v4/search', {
//         ...baseParams,
//         q: query
//       }).catch(() => null)
//     );

//     const responses = await Promise.all(requests);
//     let articles = responses.flatMap(response => 
//       response?.articles?.map(processGNewsArticle) || []
//     );

//     if (articles.length < limit * 0.5) {
//       const fallback = await fetchFallbackRecommendations(limit, freshness);
//       articles.push(...fallback);
//     }

//     return removeDuplicates(articles).slice(0, limit * 2);
//   } catch (error) {
//     console.error('Error fetching personalized recommendations:', error);
//     return fetchFallbackRecommendations(limit, freshness);
//   }
// }

// async function fetchWithRetry(url, params, retries = 3, delay = 1000) {
//   try {
//     return await fetchCachedGNews(url, params);
//   } catch (error) {
//     if (retries > 0 && error.response?.status === 429) {
//       await new Promise(resolve => setTimeout(resolve, delay));
//       return fetchWithRetry(url, params, retries - 1, delay * 2);
//     }
//     throw error;
//   }
// }

// // Построение вариантов запросов
// function buildQueryVariants(profile) {
//   const variants = [];
//   const { keywords, categories, sources } = profile;
  
//   // Вариант 1: Основные ключевые слова + категория
//   if (keywords.length > 0 && categories.length > 0) {
//     variants.push(`(${keywords.slice(0, 3).join(' OR ')}) AND (${categories[0]})`);
//   }
  
//   // Вариант 3: По источнику
//   if (sources.length > 0) {
//     variants.push(`source:${sources[0]}`);
//   }
  
//   // Вариант 4: Случайная комбинация
//   if (keywords.length > 1 && categories.length > 1) {
//     variants.push(`(${keywords[1]}) AND (${categories[1]})`);
//   }
  
//   // Вариант 5: Только ключевые слова
//   if (keywords.length > 0) {
//     variants.push(keywords.slice(0, 2).join(' AND '));
//   }
  
//   // Fallback варианты
//   if (variants.length === 0) {
//     variants.push('news', 'world', 'technology');
//   }
  
//   return variants;
// }

// // Обработка статей из GNews API
// function processGNewsArticle(article) {
//   return {
//     title: article.title,
//     description: article.description,
//     content: article.content,
//     url: article.url,
//     imageUrl: article.image,
//     source: article.source?.name || 'Unknown',
//     publishedAt: article.publishedAt,
//     categories: article.categories || [],
//     authors: article.authors || [],
//     _keywords: extractEnhancedKeywords(article.title, article.description)
//   };
// }



// async function fetchCachedGNews(url, params) {
//   const cacheKey = `${url}-${JSON.stringify(params)}`;
//   const cached = newsCache.get(cacheKey);
//   if (cached) return cached;

//   try {
//     const response = await axios.get(url, { 
//       params: { ...params, token: process.env.GNEWS_API_KEY },
//       timeout: 100000
//     });
//     newsCache.set(cacheKey, response.data);
//     return response.data;
//   } catch (error) {
//     if (error.response?.status === 429) {
//       // Кэшируем пустой результат на 1 минуту при ошибке 429
//       newsCache.set(cacheKey, { articles: [] }, 60);
//     }
//     throw error;
//   }
// }

// // Fallback-рекомендации
// async function fetchFallbackRecommendations(limit, freshness) {
//   // Сначала проверяем кэш
//   const cacheKey = `fallback-${freshness}-${limit}`;
//   const cached = newsCache.get(cacheKey);
//   if (cached) return cached.slice(0, 10);

//   // Локальный резервный набор новостей
//   const localFallbackNews = [
//     {
//       title: "Latest Technology Trends",
//       description: "Stay updated with the newest technology trends",
//       url: "https://example.com/tech-trends",
//       image: "https://example.com/tech.jpg",
//       publishedAt: new Date().toISOString(),
//       source: { name: "TechNews" }
//     },
//     // Добавьте другие резервные новости по необходимости
//   ];

//   for (const strategy of FALLBACK_STRATEGIES) {
//     try {
//       const params = {
//         max: limit,
//         lang: 'en',
//         from: getFreshnessDate(freshness),
//         token: process.env.GNEWS_API_KEY
//       };

//       if (strategy === 'headlines') params.country = 'us';
//       if (strategy === 'trending') params.topic = 'general';
//       if (strategy === 'popular') params.sortby = 'popular';

//       const data = await fetchCachedGNews('https://gnews.io/api/v4/top-headlines', params);
//       if (data?.articles?.length > 0) {
//         const result = data.articles.map(processGNewsArticle).slice(0, limit);
//         newsCache.set(cacheKey, result, 60); // Кэшируем на 1 минуту
//         return result;
//       }
//     } catch (error) {
//       console.error(`Fallback strategy ${strategy} failed:`, error.message);
//       // При ошибке 429 делаем паузу перед следующей попыткой
//       if (error.response?.status === 429) {
//         await new Promise(resolve => setTimeout(resolve, 100000));
//       }
//     }
//   }

//   // Если все стратегии не сработали, возвращаем локальный резерв
//   newsCache.set(cacheKey, localFallbackNews, 60);
//   return localFallbackNews.slice(0, 10);
// }

// // Обработка и ранжирование рекомендаций
// async function processRecommendations(articles, profile, userId) {
//   // 1. Фильтрация уже просмотренных новостей
//   const viewedUrls = await News.find({ userId }).distinct('url');
//   articles = articles.filter(article => !viewedUrls.includes(article.url));
  
//   // 2. Фильтрация по нелюбимым ключевым словам
//   if (profile.dislikedKeywords.length > 0) {
//     articles = articles.filter(article => 
//       !profile.dislikedKeywords.some(keyword =>
//         article.title.toLowerCase().includes(keyword.toLowerCase()) ||
//         article.description?.toLowerCase().includes(keyword.toLowerCase())
//       )
//     );
//   }
  
//   // 3. Расчет релевантности для каждой статьи
//   articles.forEach(article => {
//     article.relevanceScore = calculateArticleRelevance(article, profile);
//   });
  
//   // 4. Сортировка по релевантности
//   articles.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
//   // 5. Добавление разнообразия
//   return diversifyRecommendations(articles);
// }

// // Расчет релевантности статьи (без учета тональности)
// function calculateArticleRelevance(article, profile) {
//   let score = 0;
  
//   // Совпадение ключевых слов
//   if (article._keywords && profile.keywords) {
//     const matchedKeywords = article._keywords.filter(kw => 
//       profile.keywords.includes(kw)
//     ).length;
//     score += matchedKeywords * 0.3; // Увеличили вес ключевых слов
//   }
  
//   // Совпадение категорий
//   if (article.categories && profile.categories) {
//     const matchedCategories = article.categories.filter(cat => 
//       profile.categories.includes(cat)
//     ).length;
//     score += matchedCategories * 0.4; // Увеличили вес категорий
//   }
  
//   // Совпадение источников
//   if (article.source && profile.sources.includes(article.source)) {
//     score += 0.3; // Увеличили вес источников
//   }
  
//   // Новизна статьи
//   const articleAge = Date.now() - new Date(article.publishedAt).getTime();
//   const freshnessScore = 1 - Math.min(1, articleAge / (7 * 24 * 3600 * 1000));
//   score += freshnessScore * 0.2;
  
//   // Наличие изображения
//   if (article.imageUrl) {
//     score += 0.1;
//   }
  
//   // Длина контента
//   const contentLength = (article.content || '').length;
//   if (contentLength > 1000) score += 0.1;
//   else if (contentLength > 500) score += 0.05;
  
//   return Math.min(1, score);
// }

// // Добавление разнообразия в рекомендации
// function diversifyRecommendations(articles, maxSameSource = 2) {
//   const sourceCounts = {};
//   const diversified = [];
  
//   for (const article of articles) {
//     const source = article.source || 'unknown';
//     sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    
//     if (sourceCounts[source] <= maxSameSource) {
//       diversified.push(article);
//     }
    
//     if (diversified.length >= articles.length * 0.8) {
//       break;
//     }
//   }
  
//   // Добавляем оставшиеся без учета лимита по источникам
//   const remaining = articles.filter(a => !diversified.includes(a));
//   return [...diversified, ...remaining];
// }

// // Вспомогательные функции

// function getFreshnessDate(freshness) {
//   const now = new Date();
//   switch (freshness) {
//     case 'day': return new Date(now.setDate(now.getDate() - 1)).toISOString();
//     case 'week': return new Date(now.setDate(now.getDate() - 7)).toISOString();
//     case 'month': return new Date(now.setMonth(now.getMonth() - 1)).toISOString();
//     default: return new Date(now.setDate(now.getDate() - 3)).toISOString();
//   }
// }

// function determineSortingStrategy(profile) {
//   if (profile.freshness === 'recent') return 'publishedAt';
//   return 'popular'; // По умолчанию сортируем по популярности
// }

// function calculateFreshnessPreference(newsItems) {
//   if (newsItems.length === 0) return 'recent';
  
//   const now = Date.now();
//   const avgAge = newsItems.reduce((sum, item) => {
//     return sum + (now - new Date(item.publishedAt).getTime());
//   }, 0) / newsItems.length;
  
//   const DAY = 86400000;
//   if (avgAge < DAY * 1.5) return 'recent';
//   if (avgAge < DAY * 5) return 'balanced';
//   return 'any';
// }

// function removeDuplicates(articles) {
//   const uniqueUrls = new Set();
//   return articles.filter(article => {
//     if (uniqueUrls.has(article.url)) return false;
//     uniqueUrls.add(article.url);
//     return true;
//   });
// }

// function generateCacheKey(userId, userProfile, pageNumber, limitNumber, freshness, seed) {
//   const { keywords, categories, sources } = userProfile;
//   return `${userId}-${pageNumber}-${limitNumber}-${freshness}-${seed}-${
//     keywords.slice(0, 3).join(',')
//   }-${categories.join(',')}-${sources.join(',')}`;
// }

// function formatResponse(res, recommendations, totalCount, page, limit) {
// const exact10 = recommendations.slice(0, 10);
//   return res.status(200).json({
//     recommendations: exact10,
//     pagination: {
//       currentPage: page,
//       totalPages: Math.ceil(totalCount / limit),
//       totalCount,
//       limit: 10 // Всегда указываем лимит 10
//     }
//   });
// }

// function handleRecommendationError(res, error) {
//   if (error.response?.status === 429) {
//     return res.status(429).json({
//       error: 'Too Many Requests',
//       message: 'API rate limit exceeded. Please try again later.'
//     });
//   }
  
//   return res.status(500).json({
//     error: 'Internal Server Error',
//     message: 'Failed to generate recommendations',
//     details: process.env.NODE_ENV === 'development' ? error.message : undefined
//   });
// }

