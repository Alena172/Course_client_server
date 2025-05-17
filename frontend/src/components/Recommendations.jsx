import React, { useState, useEffect } from 'react';
import API from '../api';
import { getSafeImageUrl } from '../utils/imageUtils';
import './NewsFeed.css';

const Recommendations = ({ onAddToJournal }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recPageSize] = useState(12);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Функция для генерации случайных тем (на основе журнала или фоллбэка)
  const generateRandomQuery = (journalData) => {
    if (!Array.isArray(journalData) || journalData.length === 0) {
      return getFallbackQuery();
    }

    const fallbackTopics = [
      'technology',
      'business',
      'science',
      'politics',
      'sports',
      'entertainment',
      'health'
    ];

    const randomIndex = Math.floor(Math.random() * fallbackTopics.length);
    return fallbackTopics[randomIndex];
  };

  const getFallbackQuery = () => {
    const fallbackTopics = [
      'technology',
      'business',
      'science',
      'politics',
      'sports',
      'entertainment',
      'health'
    ];
    const randomIndex = Math.floor(Math.random() * fallbackTopics.length);
    return fallbackTopics[randomIndex];
  };

  const fetchRecommendations = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      setLoading(true);
      setError('');

      // Получаем журнал пользователя
      const journalResponse = await API.get(`/api/news/${userId}/journal`);
      setJournalEntries(journalResponse.data);

      // Генерируем запрос на основе данных из журнала
      const query = generateRandomQuery(journalResponse.data);

      // Получаем рекомендации
      const response = await API.get(`/api/news/recommendations/${userId}`, {
        params: {
          limit: recPageSize,
          query: query,
          seed: refreshSeed // <-- Это должно быть числом или строкой
        }
      });

      if (response.data?.recommendations) {
        setRecommendations(response.data.recommendations);
      }
    } catch (err) {
      console.error('Ошибка загрузки рекомендаций:', err);
      setError('Не удалось загрузить рекомендации');
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = () => {
    setRefreshSeed(Date.now()); // Меняем seed для нового запроса
  };

  const handleAddToJournal = async (newsItem) => {
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      if (!userId || !token) {
        alert('Для добавления в журнал необходимо авторизоваться');
        return;
      }

      const entryData = {
        userId,
        url: newsItem.url,
        source: newsItem.source?.name || 'unknown',
        title: newsItem.title || '',
        description: newsItem.description || '',
        content: newsItem.content || newsItem.description || '',
        imageUrl: newsItem.urlToImage || newsItem.imageUrl || '',
        publishedAt: newsItem.publishedAt || new Date().toISOString(),
        author: newsItem.author || ''
      };

      await API.post('/api/news/journal', entryData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      alert('Новость успешно добавлена в журнал');
      if (onAddToJournal) onAddToJournal();
      fetchRecommendations(); // Обновляем рекомендации
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert(err.response?.data?.message || 'Ошибка при добавлении в журнал');
    }
  };

  const handleRecImageError = (index) => {
    setRecommendations((prevRecs) => prevRecs.filter((_, i) => i !== index));
  };

  useEffect(() => {
    fetchRecommendations();
  }, [refreshSeed]);

  return (
    <div className="recommendations-section">
      <div className="recommendations-header">
        <h2 className="recommendations-title">
          Рекомендуем вам
          {loading && <span className="loading-indicator"> (загрузка...)</span>}
        </h2>
        <button
          onClick={refreshRecommendations}
          className="refresh-button"
          disabled={loading}
        >
          Показать другие
        </button>
      </div>

      {error ? (
        <p className="error-message">{error}</p>
      ) : !loading && recommendations.length === 0 ? (
        <p className="no-recs">
          {journalEntries.length > 0
            ? 'Не удалось найти рекомендации. Попробуйте добавить больше новостей.'
            : 'Добавьте новости в журнал, чтобы получить рекомендации'}
        </p>
      ) : (
        <div className="recommendations-grid">
          {recommendations.map((item, index) => (
            <article key={`rec-${index}-${refreshSeed}`} className="recommendation-card">
              {item.imageUrl && (
                <div className="image-container">
                  <img
                    src={getSafeImageUrl(item.imageUrl)}
                    alt={item.title}
                    onError={() => handleRecImageError(index)}
                  />
                </div>
              )}
              <div className="rec-content">
                <h3 className="rec-title">{item.title}</h3>
                <p className="rec-description">{item.description}</p>
                <div className="rec-footer">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rec-link"
                  >
                    Читать
                  </a>
                  <div className="rec-actions">
                    <button
                      onClick={() => handleAddToJournal(item)}
                      className="rec-add-button"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;