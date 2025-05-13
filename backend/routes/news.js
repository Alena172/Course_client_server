const express = require('express');
const router = express.Router(); 
const auth = require('../middleware/auth');
const newsController = require('../controllers/newsController')
const {
  deleteNews,
  addToJournal,
  getUserJournal,
  deleteFromJournal,
  getRecommendations
} = require('../controllers/newsController');

const axios = require('axios');

// Новый маршрут для проксирования запросов к NewsAPI
router.get('/proxy/newsapi', async (req, res) => {
  try {
    const { 
      country = 'us', 
      lang = 'en', 
      category, 
      query, 
      max = 10 
    } = req.query;

    // Проверяем наличие API ключа
    if (!process.env.GNEWS_API_KEY) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'GNEWS_API_KEY is not configured'
      });
    }

    // Формируем параметры запроса
    const params = {
      token: process.env.GNEWS_API_KEY,
      country,
      lang,
      max
    };

    if (category) params.category = category;
    if (query) params.q = query;

    // Делаем запрос к GNews API
    const response = await axios.get('https://gnews.io/api/v4/top-headlines', {
      params,
      timeout: 10000 // 10 секунд таймаут
    });

    // Преобразуем ответ в формат, совместимый с вашим фронтендом
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
});

// Маршруты для работы с журналом
router.post('/journal', auth,  addToJournal);// Добавление в журнал

router.delete('/journal/:entryId',auth, deleteFromJournal); // Удаление из журнала

router.get('/:userId/journal', auth, getUserJournal); // Получение журнала пользователя

// Маршруты рекомендаций
router.get('/recommendations/:userId', auth, getRecommendations); // Получение рекомендаций

// Управление новостями (админские)
router.delete('/:id', auth, newsController.deleteNews); // Удаление новости

// router.get('/search', auth, newsController.searchNews);

module.exports = router;