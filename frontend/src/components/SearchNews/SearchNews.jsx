import { useState, useEffect, useCallback, useRef } from 'react';
import './SearchNews.css';
import API from '../../api';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

const SearchNews = ({onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const searchTimer = useRef(null);

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
        setCurrentPage(pageNumber);
        setTotalPages(pages);
      }
      setHasMore(response.data.currentPage < response.data.totalPages);
      onSearch?.({ query: searchQuery, results: allArticles });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Ошибка поиска:', err.message);
      if (!append) {
        setResults([]);
        setTotalResults(0);
        setHasMore(false);
        onSearch?.({ query: '', results: [] });
      }
    } finally {
      setIsSearching(false);
    }
  }, []);


  const handlePageClick = (pageNumber) => {
    if (isSearching || pageNumber === currentPage) return;
    fetchPage(query, pageNumber, false);
  };


  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setCurrentPage(1);
    setHasMore(true);

    if (!value.trim()) {
      setResults([]);
      setTotalResults(0);
      setHasMore(false);
      onSearch?.({ query: '', results: [] });
      return;
    }


    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      fetchPage(value, 1);
    }, 1000);
  };


  useEffect(() => {
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, []);


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


  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(
      <button
        key="prev"
        className="page-button prev"
        onClick={() => handlePageClick(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ← Назад
      </button>
    );
    if (currentPage !== 1) {
      pages.push(
        <button
          key={1}
          className={`page-number ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => handlePageClick(1)}
          disabled={isSearching}
        >
          1
        </button>
      );
    }
    if (currentPage > 3) {
      pages.push(<span key="dots-start" className="pagination-dots">…</span>);
    }
    for (let i = -2; i <= -1; i++) {
      const num = currentPage + i;
      if (num > 1 && num <= totalPages) {
        pages.push(
          <button
            key={num}
            className="page-number"
            onClick={() => handlePageClick(num)}
            disabled={isSearching}
          >
            {num}
          </button>
        );
      }
    }
    pages.push(
      <button key={currentPage} className="page-number active" disabled>
        {currentPage}
      </button>
    );
    for (let i = 1; i <= 2; i++) {
      const num = currentPage + i;
      if (num < totalPages) {
        pages.push(
          <button
            key={num}
            className="page-number"
            onClick={() => handlePageClick(num)}
            disabled={isSearching}
          >
            {num}
          </button>
        );
      }
    }
    if (currentPage < totalPages - 2) {
      pages.push(<span key="dots-end" className="pagination-dots">…</span>);
    }

    if (currentPage !== totalPages) {
      pages.push(
        <button
          key={totalPages}
          className="page-number"
          onClick={() => handlePageClick(totalPages)}
          disabled={isSearching}
        >
          {totalPages}
        </button>
      );
    }
    pages.push(
      <button
        key="next"
        className="page-button next"
        onClick={() => handlePageClick(currentPage + 1)}
        disabled={currentPage === totalPages || isSearching}
      >
        Вперед →
      </button>
    );

    return <div className="pagination">{pages}</div>;
  };
return (
  <div className="all-news-page">
    <h2>Поиск новостей</h2>
    <div className="filters">
      <input
        type="text"
        placeholder="Например: AI, google, minecraft"
        value={query}
        onChange={handleInputChange}
        className="search-input"
      />
      {query && results.length > 0 && (
        <button
          className="clear-search"
          onClick={() => {
            setQuery('');
            setResults([]);
            setHasMore(false);
            onSearch?.({ query: '', results: [] });
          }}
        >
          Очистить поиск
        </button>
      )}
    </div>
    {isSearching && <span className="loading-text">Идёт поиск...</span>}
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
      ))}
    </div>
    {query.trim() && results.length > 0 && totalPages > 1 && (
      <div className="load-more-container">
        <div className="pagination-wrapper">
          {renderPagination()}
        </div>
        {!hasMore && (
          <p className="no-more-results">Все результаты загружены</p>
        )}
      </div>
    )}
  </div>
);
};

export default SearchNews;