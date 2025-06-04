import React, { useState, useEffect } from 'react';
import './Recommendations.css';
import API from '../../api';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};
const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPage = async (pageNumber, append = false) => {
    setLoading(true);
    setError('');
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('Пользователь не авторизован');
      const response = await API.get(`/api/news/recommendations/${userId}`, {
        params: {
          page: pageNumber,
          maxPerPage: 6
        }
      });
      const results = response.data.recommendations || [];
      if (append) {
        setRecommendations(prev => [...prev, ...results]);
      } else {
        setRecommendations(results);
      }
      setCurrentPage(pageNumber);
      setHasMore(response.data.currentPage < response.data.totalPages);

    } catch (err) {
      console.error('Ошибка загрузки рекомендаций:', err.message);
      setError('Не удалось загрузить рекомендации');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(1);
  }, []);

  const loadMore = () => {
    if (!hasMore) return;
    fetchPage(currentPage + 1, true);
  };

  const handleAddToJournal = async (newsItem) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!userId || !token) {
      alert('Авторизуйтесь для добавления в журнал');
      return;
    }

    try {
      await API.post('/api/news/journal', {
        ...newsItem,
        userId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      alert('Статья сохранена в вашем журнале');
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Эта новость уже в вашем журнале');
      } else {
        console.error('Ошибка при сохранении:', err.message);
        alert('Не удалось сохранить статью');
      }
    }
  };
  return (
    <div className="all-news-page">
      <h1>Рекомендуем вам</h1>
      {error && <p className="error-message">{error}</p>}
      <div className="news-grid">
        {recommendations.length > 0 ? (
          recommendations.map((article, index) => (
            <div key={`rec-${index}`} className="news-card">
              {article.imageUrl && (
                <div className="news-image">
                  <img src={article.imageUrl} alt={article.title} />
                </div>
              )}
              <div className="news-content">
                <h3>{article.title}</h3>
                <p className="news-description">
                  {article.description || 'Описание отсутствует'}
                </p>
                <p className="published-at">{formatDate(article.publishedAt)}</p>
                <div className="categories">
                  {article.categories.map(cat => (
                    <span key={cat} className="category-tag">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
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
            {loading ? '' : error ? 'Нет рекомендаций' : 'Добавьте статьи в журнал'}
          </p>
        )}
      </div>
      <div className="load-more-container">
        {loading && <span className="loading-text">Загрузка...</span>}
        {!loading && hasMore && (
          <button className="load-more-button" onClick={loadMore}>
            Показать другие
          </button>
        )}
      </div>
    </div>
  );
};

export default Recommendations;