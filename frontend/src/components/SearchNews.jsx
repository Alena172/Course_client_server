import React, { useState, useEffect, useCallback } from 'react';
import API from '../api';
import './NewsFeed.css';

const SearchNews = ({ onAddToJournal, extractKeywords, categorizeContent, onResultsChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);
  const [lastPublishedAt, setLastPublishedAt] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const handleSearch = useCallback(async (searchQuery, loadMore = false) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const params = {
        q: searchQuery,
        pageSize: 10,
      };

      if (loadMore && lastPublishedAt) {
        params.after = lastPublishedAt;
      }

      const response = await API.get('/api/news/search', { params });

      const data = response.data;
      const articles = data.articles || [];
      const total = data.totalResults || 0;

      if (loadMore) {
        setResults(prev => [...prev, ...articles]);
      } else {
        setResults(articles);
        setTotalResults(total);
        setInitialLoadDone(true);
      }

      // Обновляем курсор для пагинации
      if (articles.length > 0) {
        const newLastPublishedAt = articles[articles.length - 1].publishedAt;
        setLastPublishedAt(newLastPublishedAt);
        // Проверяем, есть ли еще статьи (если получено меньше запрошенного, значит это конец)
        setHasMore(articles.length >= params.pageSize);
      } else {
        setHasMore(false);
      }

      if (onResultsChange) {
        onResultsChange({
          results: loadMore ? [...results, ...articles] : articles,
          totalResults: total,
          isSearching: true,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      if (!loadMore) {
        setResults([]);
        setTotalResults(0);
        if (onResultsChange) {
          onResultsChange({ results: [], totalResults: 0, isSearching: false });
        }
      }
      // В случае ошибки при загрузке дополнительных данных, оставляем hasMore как есть
    } finally {
      setIsSearching(false);
    }
  }, [lastPublishedAt, results, onResultsChange]);

  const handleLoadMore = () => {
    if (!isSearching && hasMore) {
      handleSearch(query, true);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setLastPublishedAt(null); // Сбрасываем курсор при новом поиске
    setInitialLoadDone(false);
    setHasMore(false);

    if (timeoutId) clearTimeout(timeoutId);

    if (value.length > 2) {
      const id = setTimeout(() => {
        handleSearch(value);
      }, 2000);
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
          {isSearching && !initialLoadDone && <div className="search-spinner">Загрузка...</div>}
        </div>
      </div>

      {results.length > 0 && (
        <div className="search-results-section">
          <h3 className="search-results-title">
            Результаты поиска по запросу: "{query}" ({totalResults} найдено)
          </h3>
          <div className="news-grid">
            {results.map((newsItem, index) => (
              <article key={`search-${index}`} className="news-card">
                <div className="image-container">
                  <img
                    src={newsItem.image || 'https://via.placeholder.com/300x200?text=No+Image'}
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
          {hasMore && (
            <div className="load-more-container">
              <button 
                onClick={handleLoadMore}
                disabled={isSearching}
                className="load-more-button"
              >
                {isSearching ? 'Загрузка...' : 'Загрузить еще'}
              </button>
            </div>
          )}
          {!hasMore && initialLoadDone && results.length > 0 && (
            <div className="no-more-results">
              Показаны все результаты по вашему запросу
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchNews;