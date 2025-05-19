import React, { useState, useEffect } from 'react';
import './AllNewsPage.css';
import API from '../api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ru } from 'date-fns/locale';

const CATEGORIES = [
  { value: '', label: 'Все категории' },
  { value: 'technology', label: 'Технологии' },
  { value: 'business', label: 'Бизнес' },
  { value: 'science', label: 'Наука' },
  { value: 'politics', label: 'Политика' },
  { value: 'sports', label: 'Спорт' },
  { value: 'world', label: 'Мир' },
  { value: 'culture', label: 'Культура' },
  { value: 'healthcare', label: 'Здоровье' }
];

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
};

const AllNewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    fromDate: null,
    toDate: null,
    selectedTags: []
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // --- Функция сохранения в журнал ---
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
      console.log('Сохранено:', response.data.entry);
    } catch (err) {
      if (err.response?.status === 409) {
        alert('Эта статья уже в вашем журнале');
      } else {
        console.error('Ошибка при сохранении:', err.message);
        alert('Не удалось сохранить статью');
      }
    }
  };

  // Загрузка новостей
  const fetchNews = async (pageNumber, append = false) => {
    setLoading(true);
    try {
      const params = {
        page: pageNumber,
        maxPerPage: 6
      };

      if (filters.category) params.category = filters.category;
      if (filters.fromDate) params.from = filters.fromDate.toISOString().split('T')[0];
      if (filters.toDate) params.to = filters.toDate.toISOString().split('T')[0];
      if (filters.selectedTags.length > 0) params.q = filters.selectedTags.join(' OR ');

      const endpoint = filters.selectedTags.length > 0 ? '/api/news/search' : '/api/news/all';

      const response = await API.get(endpoint, {
        params
      });

      const results = response.data.articles || [];

      if (append) {
        setNews(prev => [...prev, ...results]);
      } else {
        setNews(results);
      }

      const totalPages = Math.ceil(response.data.totalResults / 6);
      setHasMore(pageNumber < totalPages);

    } catch (err) {
      console.error('Ошибка при получении новостей:', err.message);
      alert('Не удалось загрузить новости');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setNews([]);
      setPage(1);
      setHasMore(true);
      fetchNews(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.category, filters.fromDate, filters.toDate, filters.selectedTags]);

  const loadMore = () => {
    fetchNews(page + 1, true);
    setPage(p => p + 1);
  };

  const handleCategoryChange = (e) => {
    setFilters((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleFromDateChange = (date) => {
    setFilters((prev) => ({ ...prev, fromDate: date }));
  };

  const handleToDateChange = (date) => {
    setFilters((prev) => ({ ...prev, toDate: date }));
  };

  const toggleTag = (tag) => {
    setFilters((prev) => {
      const isSelected = prev.selectedTags.includes(tag);
      const updatedTags = isSelected
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag];
      return { ...prev, selectedTags: updatedTags };
    });
  };

  return (
    <div className="all-news-page">
      <h1>Новости</h1>

      {/* Фильтры */}
      <div className="filters">
        {/* Категория */}
        <div className="filter-group">
          <label htmlFor="category">Категория:</label>
          <div className="select-wrapper">
            <select id="category" value={filters.category} onChange={handleCategoryChange}>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <span className="select-icon">▼</span>
          </div>
        </div>

        {/* Дата от */}
        <div className="filter-group">
          <label>Дата от:</label>
          <DatePicker
            selected={filters.fromDate}
            onChange={handleFromDateChange}
            selectsStart
            startDate={filters.fromDate}
            endDate={filters.toDate}
            placeholderText="Выберите дату"
            locale={ru}
            dateFormat="dd.MM.yyyy"
            isClearable
            className="custom-date-picker"
          />
        </div>

        {/* Дата до */}
        <div className="filter-group">
          <label>Дата до:</label>
          <DatePicker
            selected={filters.toDate}
            onChange={handleToDateChange}
            selectsEnd
            startDate={filters.fromDate}
            endDate={filters.toDate}
            minDate={filters.fromDate}
            placeholderText="Выберите дату"
            locale={ru}
            dateFormat="dd.MM.yyyy"
            isClearable
            className="custom-date-picker"
          />
        </div>

        {/* Выбранные теги */}
        <div className="filter-group filter-group--tags">
          <label>Активные темы:</label>
          <div className="selected-tags">
            {filters.selectedTags.length === 0 && <span>Нет активных тем</span>}
            {filters.selectedTags.map(tag => (
              <span
                key={tag}
                className="selected-tag"
                onClick={() => toggleTag(tag)}
              >
                #{tag} ×
              </span>
            ))}
          </div>
        </div>
      </div>

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
                {/* Хештеги */}
                <div className="card-tags">
                  {article.tags.map(tag => (
                    <span
                      key={tag}
                      className="card-tag"
                      onClick={() => toggleTag(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                {/* Кнопка "Сохранить" */}
                <button
                  className="save-to-journal-button"
                  onClick={() => handleAddToJournal(article)}
                >
                  Сохранить
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>Новостей не найдено</p>
        )}
      </div>

      {/* Кнопка "Показать ещё" */}
      <div className="load-more-container">
        {loading && <span className="loading-text">Загрузка...</span>}
        {!loading && hasMore && (
          <button onClick={loadMore} className="load-more-button">
            Показать ещё
          </button>
        )}
      </div>
    </div>
  );
};

export default AllNewsPage;