// SearchNews.jsx
import React, { useState, useEffect } from 'react';
import API from '../api';
import './NewsFeed.css'; // Используем те же стили

const SearchNews = ({ onAddToJournal, extractKeywords, categorizeContent, onResultsChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await API.get('/api/news/search', {
        params: { q: searchQuery, page: 1, pageSize: 10 }, // всегда первая страница
      });

      const data = response.data;
      const articles = data.articles || [];
      const total = data.totalResults || 0;

      setResults(articles);
      setTotalResults(total);

      // Уведомляем родительский компонент о результатах
      if (onResultsChange) {
        onResultsChange({
          results: articles,
          totalResults: total,
          isSearching: true,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalResults(0);
      if (onResultsChange) {
        onResultsChange({ results: [], totalResults: 0, isSearching: false });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (timeoutId) clearTimeout(timeoutId);

    if (value.length > 2) {
      const id = setTimeout(() => handleSearch(value), 2000);
      setTimeoutId(id);
    } else {
      setResults([]);
      setTotalResults(0);
      if (onResultsChange) {
        onResultsChange({ results: [], totalResults: 0, isSearching: false });
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return (
    <div className="news-feed">
      <div className="news-feed-header">
        <h2 className="news-feed-title">Новостная лента</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Поиск новостей..."
            value={query}
            onChange={handleInputChange}
            className="search-input"
          />
          {isSearching && <div className="search-spinner">Загрузка...</div>}
        </div>
      </div>

      {results.length > 0 && (
        <div className="search-results-section">
          <h3 className="search-results-title">
            Результаты поиска по запросу: "{query}"
          </h3>
          <div className="news-grid">
            {results.map((newsItem, index) => (
              <article key={`search-${index}`} className="news-card">
                <div className="image-container">
                  <img
                    src={newsItem.image || 'https://via.placeholder.com/300x200?text=No+Image '}
                    alt={newsItem.title || 'Новость без заголовка'}
                    className="news-image"
                  />
                </div>
                <div className="card-content">
                  <h3 className="news-title">{newsItem.title}</h3>
                  <p className="news-description">{newsItem.description}</p>
                  <div className="card-footer">
                    <a href={newsItem.url} target="_blank" rel="noopener noreferrer" className="read-more">
                      Читать полностью
                    </a>
                    <button onClick={() => onAddToJournal(newsItem)} className="add-button">
                      Сохранить
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchNews;