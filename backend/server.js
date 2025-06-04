const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');

dotenv.config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://course-client-server.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Что-то пошло не так');
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB подключено');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
})
.catch(err => {
  console.error('MongoDB ошибка соединения:', err);
  process.exit(1);
});

