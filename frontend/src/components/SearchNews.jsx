import React, { useState, useEffect, useCallback } from 'react';
import './AllNewsPage.css';
import API from '../api';

const SearchNews = ({ onAddToJournal }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // === Поиск ===
  const fetchPage = useCallback(async (searchQuery, pageNumber, append = false) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await API.get('/api/news/strict-search', {
        params: {
          q: searchQuery,
          page: pageNumber,
          maxPerPage: 10
        }
      });

      const allArticles = response.data.articles || [];
      const total = response.data.totalResults || allArticles.length;
      const pages = response.data.totalPages || Math.ceil(total / 10);

      if (append) {
        setResults(prev => [...prev, ...allArticles]);
      } else {
        setResults(allArticles);
        setTotalResults(total);
      }

      setCurrentPage(pageNumber);
      setHasMore(response.data.currentPage < response.data.totalPages);

    } catch (err) {
      console.error('Ошибка поиска:', err.message);
      if (!append) {
        setResults([]);
        setTotalResults(0);
        setHasMore(false);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  // === Подгрузка следующей страницы ===
  const loadMore = () => {
    if (!hasMore || isSearching) return;
    fetchPage(query, currentPage + 1, true);
  };

  // === Изменение поискового поля ===
  const handleInputChange = (e) => {
  const value = e.target.value;
  setQuery(value);
  setCurrentPage(1);
  setHasMore(true);

  if (!value.trim()) {
    setResults([]);
    setTotalResults(0);
    setHasMore(false); // ← добавлено
    return;
  }

  const timer = setTimeout(() => {
    fetchPage(value, 1);
  }, 1000);

  return () => clearTimeout(timer);
};

  // === Сохранение в журнал ===
  const handleAddToJournal = async (newsItem) => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

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

      alert('Статья сохранена в журнале');
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Эта статья уже в вашем журнале');
      } else {
        console.error('Ошибка при сохранении:', err.message);
        alert('Не удалось сохранить статью');
      }
    }
  };

  return (
    <div className="all-news-page">
      <h2>Поиск новостей</h2>

      {/* Поле поиска */}
      <div className="filters">
        <input
          type="text"
          placeholder="Например: AI, спорт, климат"
          value={query}
          onChange={handleInputChange}
          className="search-input"
        />
      </div>

      {/* Сообщения */}
      {isSearching && <span className="loading-text">Идёт поиск...</span>}
      {!isSearching && results.length === 0 && query && <p>Ничего не найдено</p>}

      {/* Список новостей */}
      <div className="news-grid">
        {results.map((article, index) => (
          <div key={`search-${index}`} className="news-card">
            {article.imageUrl && (
              <div className="news-image">
                <img src={article.imageUrl} alt={article.title} />
              </div>
            )}
            <div className="news-content">
              <h3>{article.title}</h3>
              <p className="published-at">{new Date(article.publishedAt).toLocaleDateString()}</p>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-more">
                Читать далее
              </a>
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
        ))}
      </div>

      {/* Кнопка дозагрузки */}
      <div className="load-more-container">
        {isSearching && <span className="loading-text">Загрузка...</span>}
        {!isSearching && hasMore && query && results.length > 0 && (
          <button className="load-more-button" onClick={loadMore}>
            Показать ещё
          </button>
        )}
        {!hasMore && results.length > 0 && (
          <p className="no-more-results">Все результаты загружены</p>
        )}
      </div>
    </div>
  );
};

export default SearchNews;