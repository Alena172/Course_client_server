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

  // Функция для извлечения ключевых слов с учетом весов
  const extractKeywordsWithWeights = (title = '', description = '') => {
    const text = `${title} ${description}`.toLowerCase();
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'was']);
    
    const words = text.split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    const keywordFrequency = {};
    words.forEach(word => {
      keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
    });
    
    return Object.entries(keywordFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({ word, weight: count }));
  };

  // Функция для генерации случайных комбинаций ключевых слов
  const generateRandomQuery = (keywordsWithWeights) => {
    if (keywordsWithWeights.length === 0) {
      return getFallbackQuery();
    }

    // Сортируем ключевые слова по весу
    const sortedKeywords = [...keywordsWithWeights].sort((a, b) => b.weight - a.weight);
    
    // Берем 3 самых популярных ключевых слова
    const topKeywords = sortedKeywords.slice(0, 3).map(k => k.word);
    
    // Добавляем 1-2 случайных ключевых слова из оставшихся
    const otherKeywords = sortedKeywords.slice(3);
    if (otherKeywords.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherKeywords.length);
      topKeywords.push(otherKeywords[randomIndex].word);
      
      if (otherKeywords.length > 1 && Math.random() > 0.5) {
        const secondRandomIndex = (randomIndex + 1) % otherKeywords.length;
        topKeywords.push(otherKeywords[secondRandomIndex].word);
      }
    }
    
    // Перемешиваем ключевые слова для разнообразия
    const shuffled = [...topKeywords].sort(() => Math.random() - 0.5);
    
    // Формируем запрос с 2-3 ключевыми словами
    const queryLength = Math.min(2 + Math.floor(Math.random() * 2), shuffled.length);
    return shuffled.slice(0, queryLength).join(' OR ');
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
      
      // Сначала получаем журнал пользователя для анализа ключевых слов
      const journalResponse = await API.get(`/api/news/${userId}/journal`);
      setJournalEntries(journalResponse.data);
      
      // Извлекаем ключевые слова из всех записей журнала
      const allKeywords = journalResponse.data.reduce((acc, item) => {
        const keywords = extractKeywordsWithWeights(item.title, item.description);
        return [...acc, ...keywords];
      }, []);
      
      // Группируем и суммируем веса одинаковых ключевых слов
      const keywordWeights = {};
      allKeywords.forEach(({ word, weight }) => {
        keywordWeights[word] = (keywordWeights[word] || 0) + weight;
      });
      
      // Преобразуем обратно в массив объектов
      const aggregatedKeywords = Object.entries(keywordWeights)
        .map(([word, weight]) => ({ word, weight }));
      
      // Генерируем случайный запрос на основе ключевых слов
      const query = journalResponse.data.length > 0 
        ? generateRandomQuery(aggregatedKeywords)
        : getFallbackQuery();
      
      // Получаем рекомендации с новым запросом
      const response = await API.get(`/api/news/recommendations/${userId}`, {
        params: {
          limit: recPageSize,
          query: query,
          seed: refreshSeed // Добавляем seed для гарантии нового ответа от сервера
        }
      });
      
      if (response.data) {
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
    // Изменяем seed чтобы гарантировать новый запрос к API
    setRefreshSeed(Date.now());
  };

  const handleAddToJournal = async (newsItem) => {
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      if (!userId || !token) {
        alert('Для добавления в журнал необходимо авторизоваться');
        return;
      }
      
      const keywordsData = extractKeywordsWithWeights(newsItem.title, newsItem.description);
      const keywords = keywordsData.map(item => item.word);
      
      const categories = categorizeContent(newsItem.title, newsItem.description);
      
      const entryData = {
        userId,
        url: newsItem.url,
        source: newsItem.source?.name || 'unknown',
        title: newsItem.title || '',
        description: newsItem.description || '',
        content: newsItem.content || newsItem.description || '',
        imageUrl: newsItem.urlToImage || newsItem.imageUrl || '',
        publishedAt: newsItem.publishedAt || new Date().toISOString(),
        author: newsItem.author || '',
        keywords,
        categories
      };
      
      await API.post('/api/news/journal', entryData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      alert('Новость успешно добавлена в журнал');
      if (onAddToJournal) onAddToJournal();
      fetchRecommendations();
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert(err.response?.data?.message || 'Ошибка при добавлении в журнал');
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [refreshSeed]);

  // Функция категоризации контента (оставлена без изменений)
  const categorizeContent = (title = '', description = '') => {
    const text = `${title} ${description}`.toLowerCase();
    const categories = [];
    
    if (/(tech|ai|robot|computer|software)/.test(text)) categories.push('technology');
    if (/(business|market|economy|stock)/.test(text)) categories.push('business');
    if (/(science|research|space|medicine)/.test(text)) categories.push('science');
    if (/(politics|government|election)/.test(text)) categories.push('politics');
    if (/(sport|football|basketball)/.test(text)) categories.push('sports');
    if (/(game|gaming|esports|videogame|playstation|xbox|nintendo|steam|pc game)/.test(text)) categories.push('games');
    
    return categories.length > 0 ? categories : ['general'];
  };

  const handleRecImageError = (index) => {
    setRecommendations(prevRecs => prevRecs.filter((_, i) => i !== index));
  };

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
            ? "Не удалось найти рекомендации. Попробуйте добавить больше новостей."
            : "Добавьте новости в журнал, чтобы получить рекомендации"}
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