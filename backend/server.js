const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Добавлено: для работы с куками
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');

// Загружаем переменные окружения
dotenv.config();

const app = express();

// Поддержка парсинга кук
app.use(cookieParser());

// Разрешённые источники
const allowedOrigins = [
  'http://localhost:3000',
  'https://course-client-server.vercel.app ' // Исправлено: лишний пробел убран
];

// Настройки CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // ВАЖНО: разрешает отправку кук между доменами
};

// Применяем middleware
app.use(cors(corsOptions));
app.use(express.json()); // Парсим JSON-тела запросов

// Роуты
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Подключаемся к БД и запускаем сервер
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // Выход при ошибке подключения к БД
  });