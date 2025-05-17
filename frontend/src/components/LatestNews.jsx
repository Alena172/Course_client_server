import React, { useState, useEffect } from 'react';
import API from '../api';
import { getSafeImageUrl } from '../utils/imageUtils';
import './NewsFeed.css';

const LatestNews = ({ onAddToJournal }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const extractKeywords = (title = '', description = '') => {
    const text = `${title} ${description}`.toLowerCase();
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'was']);
    
    const words = text.split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    const keywordFrequency = {};
    words.forEach(word => {
      keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
    });
    
    return {
      keywords: Object.keys(keywordFrequency)
        .sort((a, b) => keywordFrequency[b] - keywordFrequency[a])
        .slice(0, 5)
    };
  };

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

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await API.get('/api/news/proxy/newsapi', {
        params: {
          endpoint: 'top-headlines',
          country: 'us'
        }
      });
      
      setNews(response.data.articles || []);
    } catch (err) {
      console.error('Ошибка при загрузке новостей:', err);
      setError('Не удалось загрузить последние новости');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (index) => {
    setNews(prevNews => prevNews.filter((_, i) => i !== index));
  };

  const handleAddToJournalInternal = async (newsItem) => {
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
      if (!userId || !token) {
        alert('Для добавления в журнал необходимо авторизоваться');
        return;
      }
      
      const { keywords } = extractKeywords(newsItem.title, newsItem.description);
      const categories = categorizeContent(newsItem.title, newsItem.description);
      
      const entryData = {
        userId,
        url: newsItem.url,
        source: newsItem.source?.name || 'unknown',
        title: newsItem.title || '',
        description: newsItem.description || '',
        content: newsItem.content || newsItem.description || '',
        imageUrl: newsItem.urlToImage || '',
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
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert(err.response?.data?.message || 'Ошибка при добавлении в журнал');
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="latest-news-section">
      <h2 className="latest-news-title">Последние новости</h2>
      
      {error ? (
        <p className="error-message">{error}</p>
      ) : loading ? (
        <p className="loading-message">Загрузка новостей...</p>
      ) : news.length === 0 ? (
        <p className="no-news">Нет доступных новостей</p>
      ) : (
        <div className="news-grid">
          {news.map((newsItem, index) => (
            <article key={`${newsItem.source?.id || index}-${index}`} className="news-card">
              {newsItem.urlToImage && (
                <div className="image-container">
                  <img 
                    src={getSafeImageUrl(newsItem.urlToImage)} 
                    alt={newsItem.title}
                    className="news-image"
                    onError={() => handleImageError(index)}
                  />
                </div>
              )}
              <div className="card-content">
                <h3 className="news-title">{newsItem.title}</h3>
                <p className="news-description">{newsItem.description}</p>
                <div className="card-footer">
                  <a 
                    href={newsItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="read-more"
                  >
                    Читать полностью
                  </a>
                  <div className="action-buttons">
                    <button 
                      onClick={() => handleAddToJournalInternal(newsItem)}
                      className="add-button"
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

export default LatestNews;