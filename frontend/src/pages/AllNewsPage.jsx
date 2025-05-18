import React, { useState, useEffect } from 'react';
import API from '../api';
import './AllNewsPage.css';

const CATEGORIES = [
  'general',
  'world',
  'nation',
  'business',
  'technology',
  'entertainment',
  'sports',
  'science',
  'health'
];

const AllNewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    fromDate: '',
    toDate: ''
  });

  const formatDateForApi = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return `${date.toISOString().split('T')[0]}T00:00:00Z`;
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = {
        category: filters.category || 'general',
        lang: 'ru',
        max: 20,
        from: formatDateForApi(filters.fromDate),
        to: formatDateForApi(filters.toDate)
      };

      // Удаляем параметры с null значениями
      Object.keys(params).forEach(key => params[key] === null && delete params[key]);

      console.log('Sending params:', params);

      const response = await API.get('/api/news/all', { params });
      console.log('Received news:', response.data.articles);

      setNews(response.data.articles || []);
    } catch (err) {
      console.error('Ошибка загрузки новостей:', err);
      alert('Не удалось загрузить новости');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters.category, filters.fromDate, filters.toDate]);

  const handleCategoryChange = (e) => {
    setFilters((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleFromDateChange = (e) => {
    setFilters((prev) => ({ ...prev, fromDate: e.target.value }));
  };

  const handleToDateChange = (e) => {
    setFilters((prev) => ({ ...prev, toDate: e.target.value }));
  };

  return (
    <div className="all-news-page">
      <h1>Все новости</h1>

      <div className="filters">
        <div className="filter-group">
          <label>Категория:</label>
          <select value={filters.category} onChange={handleCategoryChange}>
            <option value="">Все категории</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Дата от:</label>
          <input 
            type="date" 
            value={filters.fromDate} 
            onChange={handleFromDateChange}
            max={filters.toDate || new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="filter-group">
          <label>Дата до:</label>
          <input 
            type="date" 
            value={filters.toDate} 
            onChange={handleToDateChange}
            min={filters.fromDate}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {loading ? (
        <p>Загрузка новостей...</p>
      ) : (
        <div className="news-grid">
          {news.length > 0 ? (
            news.map((article, index) => (
              <div key={`news-${index}`} className="news-card">
                {article.image && (
                  <div className="news-image">
                    <img src={article.image} alt={article.title} />
                  </div>
                )}
                <div className="news-content">
                  <h3>{article.title}</h3>
                  <p className="source">Источник: {article.source?.name || 'Неизвестно'}</p>
                  <p className="description">{article.description}</p>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" className="read-more">
                    Читать далее
                  </a>
                  <p className="published-at">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p>Новостей не найдено.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AllNewsPage;