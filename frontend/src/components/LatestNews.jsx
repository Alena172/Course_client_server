import React, { useState, useEffect } from 'react';
import './LatestNews.css';
import API from '../api';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

const LatestNews = ({ onAddToJournal }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Загрузка новостей с сервера
  const fetchNews = async (pageNumber, append = false) => {
    try {
      setLoading(true);
      setError('');

      const response = await API.get('/api/news/all', {
        params: {
          page: pageNumber,
          maxPerPage: 6
        }
      });

      const results = response.data.articles || [];

      if (append) {
        setNews(prev => [...prev, ...results]);
      } else {
        setNews(results);
      }

      setCurrentPage(pageNumber);
      setHasMore(response.data.currentPage < response.data.totalPages);

    } catch (err) {
      console.error('Ошибка при получении последних новостей:', err.message);
      setError('Не удалось загрузить последние новости');
    } finally {
      setLoading(false);
    }
  };

  // Подгрузка следующей страницы
  const loadMore = () => {
    if (!hasMore) return;
    fetchNews(currentPage + 1, true);
  };

  // --- Сохранение в журнал ---
  const handleAddToJournal = async (newsItem) => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userId || !token) {
      alert('Авторизуйтесь для добавления в журнал');
      return;
    }

    try {
      const response = await API.post('/api/news/journal', {
        ...newsItem,
        userId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      alert('Статья сохранена в вашем журнале');
      if (onAddToJournal) onAddToJournal();
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Эта новость уже в вашем журнале');
      } else {
        console.error('Ошибка при сохранении:', err.message);
        alert('Не удалось сохранить статью');
      }
    }
  };

  // Первичная загрузка
  useEffect(() => {
    fetchNews(1);
  }, []);

  return (
    <div className="all-news-page">
      <h1>Последние новости</h1>
      {error && <p className="error-message">{error}</p>}

      {/* Список новостей */}
      <div className="news-grid">
        {news.length > 0 ? (
          news.map((article, index) => (
            <div key={`news-${index}`} className="news-card">
              {article.imageUrl && (
                <div className="news-image">
                  <img src={article.imageUrl} alt={article.title} />
                </div>
              )}
              <div className="news-content">
                <h3>{article.title}</h3>
                <p className="published-at">{formatDate(article.publishedAt)}</p>
                <div className="categories">
                  {article.categories.map(cat => (
                    <span key={cat} className="category-tag">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Кнопки действий внизу карточки */}
              <div className="news-actions">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action-button read-more-button"
                >
                  Читать далее
                </a>
                <button
                  className="action-button save-to-journal-button"
                  onClick={() => handleAddToJournal(article)}
                >
                  Сохранить
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-results">
            {loading ? '' : error ? 'Нет новостей' : 'Новостей не найдено'}
          </p>
        )}
      </div>

      {/* Кнопка дозагрузки */}
      <div className="load-more-container">
        {loading && <span className="loading-text">Загрузка...</span>}
        {!loading && hasMore && (
          <button className="load-more-button" onClick={loadMore}>
            Показать ещё
          </button>
        )}
      </div>
    </div>
  );
};

export default LatestNews;