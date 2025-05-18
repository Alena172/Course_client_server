import axios from 'axios';

// Для разработки берем из .env, для продакшена - из переменных Vercel
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://course-client-server-1.onrender.com' // Замените на реальный URL бэкенда
  : 'http://localhost:5000';

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Важно для CORS с credentials
});

// Интерцептор запросов
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Интерцептор ответов
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'; // Перенаправление на логин
    }
    
    // Обработка других ошибок
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error('Network Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default API;
