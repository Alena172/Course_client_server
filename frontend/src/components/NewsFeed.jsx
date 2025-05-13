import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../api';
import './NewsFeed.css';
import { getSafeImageUrl } from '../utils/imageUtils';
import { useNavigate } from 'react-router-dom';

const NewsFeed = () => {
  const [news, setNews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [pageSize] = useState(10);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [recPageSize] = useState(12); 
  const [seenUrls, setSeenUrls] = useState(new Set());
  const [userPreferences, setUserPreferences] = useState({
    likedKeywords: [],
    dislikedKeywords: [],
    preferredCategories: []
  });
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const navigate = useNavigate();

  // Функция извлечения ключевых слов
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

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(totalResults / pageSize)) {
      handleSearch(searchQuery, newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Вместо прямых запросов к NewsAPI делайте так:
const fetchNews = async () => {
  try {
    const response = await API.get('/api/news/proxy/newsapi', {
      params: {
        endpoint: 'top-headlines',
        country: 'us'
      }
    });
    setNews(response.data.articles);
  } catch (err) {
    setError('Ошибка при загрузке новостей');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

const handleSearch = async (query, page = 1) => {
  if (!query.trim()) {
    setSearchResults([]);
    setTotalResults(0);
    return;
  }

  setIsSearching(true);
  try {
    const response = await API.get('/api/news/proxy/newsapi', {
      params: {
        endpoint: 'everything',
        q: query,
        page,
        pageSize: pageSize
      }
    });
    
    if (response.data?.articles) {
      setSearchResults(response.data.articles);
      setTotalResults(response.data.totalResults);
      setCurrentPage(page);
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }
  } catch (err) {
    console.error('Search error:', err);
    setSearchResults([]);
    setTotalResults(0);
  } finally {
    setIsSearching(false);
  }
};




  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1);

    // Очищаем предыдущий таймер
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Устанавливаем новый таймер только если запрос достаточно длинный
    if (query.length > 2) {
      const timeoutId = setTimeout(() => {
        handleSearch(query, 1);
      }, 2000);
      
      setSearchTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setTotalResults(0);
    }
  };

  // Эффект для очистки таймера при размонтировании
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Функция категоризации
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

  const handleLikeArticle = (article) => {
    const { keywords } = extractKeywords(article.title, article.description);
    setUserPreferences(prev => ({
      ...prev,
      likedKeywords: [...new Set([...prev.likedKeywords, ...keywords])],
      preferredCategories: [
        ...new Set([...prev.preferredCategories, ...categorizeContent(article.title, article.description)])
      ]
    }));
    refreshRecommendations();
  };
  
  const handleDislikeArticle = (article) => {
    const { keywords } = extractKeywords(article.title, article.description);
    setUserPreferences(prev => ({
      ...prev,
      dislikedKeywords: [...new Set([...prev.dislikedKeywords, ...keywords])]
    }));
    setRecommendations(prev => 
      prev.filter(item => 
        !keywords.some(kw => 
          item.title.toLowerCase().includes(kw.toLowerCase())
        )
      )
    );
    refreshRecommendations();
  };


  const handleImageError = (index) => {
    setNews(prevNews => prevNews.filter((_, i) => i !== index));
  };

  const handleRecImageError = (index) => {
    setRecommendations(prevRecs => prevRecs.filter((_, i) => i !== index));
  };

  const fetchRecommendations = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;
      
      setLoadingRecs(true);
      
      const journalResponse = await API.get(`/api/news/${userId}/journal`);
      setJournalEntries(journalResponse.data);
      
      const response = await API.get(`/api/news/recommendations/${userId}`, {
        params: {
          version: recommendationVersion,
          limit: recPageSize, // Теперь запрашиваем больше новостей
          likedKeywords: userPreferences.likedKeywords.join(','),
          dislikedKeywords: userPreferences.dislikedKeywords.join(','),
          preferredCategories: userPreferences.preferredCategories.join(',')
        }
      });
      
      if (response.data) {
        // Фильтруем дубликаты по URL
        const uniqueRecommendations = response.data.recommendations
          .filter(item => !seenUrls.has(item.url));
        
        // Обновляем множество просмотренных URL
        setSeenUrls(prev => {
          const newSet = new Set(prev);
          uniqueRecommendations.forEach(item => newSet.add(item.url));
          return newSet;
        });
        
        setRecommendations(uniqueRecommendations);
      }
    } catch (err) {
      console.error('Ошибка загрузки рекомендаций:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Обновляем функцию обновления рекомендаций
  const refreshRecommendations = () => {
    setSeenUrls(new Set()); // Очищаем просмотренные URL
    setRecommendationVersion(prev => prev + 1);
  };


  const handleAddToJournal = async (newsItem) => {
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');
  
      if (!userId || !token) {
        alert('Для добавления в журнал необходимо авторизоваться');
        return;
      }
  
      const { keywords } = extractKeywords(newsItem.title, newsItem.description);
      const categories = categorizeContent(newsItem.title, newsItem.description);
  
      // Убедимся, что все поля передаются, включая imageUrl
      const entryData = {
        userId,
        url: newsItem.url,
        source: newsItem.source?.name || 'unknown',
        title: newsItem.title || '',
        description: newsItem.description || '',
        content: newsItem.content || newsItem.description || '',
        imageUrl: newsItem.urlToImage || newsItem.imageUrl || '', // Добавлено резервное значение
        publishedAt: newsItem.publishedAt || new Date().toISOString(),
        author: newsItem.author || '',
        keywords,
        categories
      };
  
      console.log('Отправляемые данные:', entryData); // Для отладки
  
      await API.post('/api/news/journal', entryData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      alert('Новость успешно добавлена в журнал');
      fetchRecommendations();
    } catch (err) {
      console.error('Ошибка добавления:', err);
      alert(err.response?.data?.message || 'Ошибка при добавлении в журнал');
    }
  };


  const handleGoToJournal = () => {
    navigate('/journal');
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [recommendationVersion, userPreferences]);

  if (loading) return <div className="loading">Загрузка новостей...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="news-feed">
      <div className="news-feed-header">
        <h2 className="news-feed-title">Новостная лента</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Поиск новостей..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
          {isSearching && <div className="search-spinner">Загрузка...</div>}
        </div>
        <button 
          onClick={handleGoToJournal}
          className="journal-button"
        >
          Мой журнал
        </button>
      </div>
      
      {/* Показываем результаты поиска, если они есть */}
      {searchResults.length > 0 ? (
        <div className="search-results-section">
          <h3 className="search-results-title">
            Результаты поиска по запросу: "{searchQuery}" ({totalResults} найдено)
          </h3>
          <div className="news-grid">
            {searchResults.map((newsItem, index) => (
              <article key={`search-${index}-${Date.now()}`} className="news-card">
                {newsItem.urlToImage && (
                  <div className="image-container">
                    <img 
                      src={newsItem.urlToImage} 
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
                        onClick={() => handleLikeArticle(newsItem)}
                        className="like-button"
                        title="Нравится эта тема"
                      >
                        👍
                      </button>
                      <button 
                        onClick={() => handleDislikeArticle(newsItem)}
                        className="dislike-button"
                        title="Не нравится эта тема"
                      >
                        👎
                      </button>
                      <button 
                        onClick={() => handleAddToJournal(newsItem)}
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
  
          {/* Пагинация для результатов поиска */}
          {totalResults > pageSize && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isSearching}
                className="pagination-button"
              >
                Назад
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: Math.min(5, Math.ceil(totalResults / pageSize)) }, (_, i) => {
                  let pageNum;
                  if (Math.ceil(totalResults / pageSize) <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= Math.ceil(totalResults / pageSize) - 2) {
                    pageNum = Math.ceil(totalResults / pageSize) - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isSearching}
                      className={`page-button ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === Math.ceil(totalResults / pageSize) || isSearching}
                className="pagination-button"
              >
                Вперед
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Показываем рекомендации и новости, если нет поискового запроса */
        <>
          {/* Блок рекомендаций теперь идет первым */}
          <div className="recommendations-section">
            <div className="recommendations-header">
              <h2 className="recommendations-title">
                Рекомендуем вам
                {loadingRecs && <span className="loading-indicator"> (загрузка...)</span>}
              </h2>
              <button 
                onClick={refreshRecommendations}
                className="refresh-button"
                disabled={loadingRecs}
              >
                Показать другие
              </button>
            </div>
            
            <div className="preference-tags">
              {userPreferences.likedKeywords.slice(0, 5).map(keyword => (
                <span key={`like-${keyword}`} className="like-tag">
                  #{keyword} ✓
                </span>
              ))}
              {userPreferences.dislikedKeywords.slice(0, 3).map(keyword => (
                <span key={`dislike-${keyword}`} className="dislike-tag">
                  #{keyword} ✕
                </span>
              ))}
            </div>
            
            {!loadingRecs && recommendations.length === 0 ? (
              <p className="no-recs">
                {journalEntries.length > 0 
                  ? "Не удалось найти рекомендации. Попробуйте добавить больше новостей."
                  : "Добавьте новости в журнал, чтобы получить рекомендации"}
              </p>
            ) : (
              <>
                <div className="recommendations-grid">
                  {recommendations.map((item, index) => (
                    <article key={`rec-${index}`} className="recommendation-card">
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
                              onClick={() => handleLikeArticle(item)}
                              className="rec-like-button"
                              title="Нравится эта тема"
                            >
                              👍
                            </button>
                            <button 
                              onClick={() => handleDislikeArticle(item)}
                              className="dislike-button"
                              title="Не нравится эта тема"
                            >
                              👎
                            </button>
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
              </>
            )}
          </div>
  
          {/* Блок последних новостей теперь идет после рекомендаций */}
          <div className="latest-news-section">
            <h2 className="latest-news-title">Последние новости</h2>
            
            {news.length === 0 ? (
              <p className="no-news">Нет доступных новостей</p>
            ) : (
              <div className="news-grid">
                {news.map((newsItem, index) => (
                  <article key={`${newsItem.source?.id || index}-${index}`} className="news-card">
                    {newsItem.urlToImage && (
                      <div className="image-container">
                        <img 
                          src={newsItem.urlToImage} 
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
                            onClick={() => handleLikeArticle(newsItem)}
                            className="like-button"
                            title="Нравится эта тема"
                          >
                            👍
                          </button>
                          <button 
                            onClick={() => handleDislikeArticle(newsItem)}
                            className="dislike-button"
                            title="Не нравится эта тема"
                          >
                            👎
                          </button>
                          <button 
                            onClick={() => handleAddToJournal(newsItem)}
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
        </>
      )}
    </div>
  );
}

export default NewsFeed;