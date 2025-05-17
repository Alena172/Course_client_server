// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import API from '../api';
// import './NewsFeed.css';
// import { getSafeImageUrl } from '../utils/imageUtils';
// import { useNavigate } from 'react-router-dom';

// const NewsFeed = () => {
//   const [news, setNews] = useState([]);
//   const [recommendations, setRecommendations] = useState([]);
//   const [journalEntries, setJournalEntries] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingRecs, setLoadingRecs] = useState(false);
//   const [error, setError] = useState('');
//   const [searchQuery, setSearchQuery] = useState('');
//   const [searchResults, setSearchResults] = useState([]);
//   const [isSearching, setIsSearching] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalResults, setTotalResults] = useState(0);
//   const [pageSize] = useState(10);
//   const [searchTimeout, setSearchTimeout] = useState(null);
//   const [recPageSize] = useState(12); 
//   const [seenUrls, setSeenUrls] = useState(new Set());
//   const navigate = useNavigate();

//   const extractKeywords = (title = '', description = '') => {
//     const text = `${title} ${description}`.toLowerCase();
//     const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'was']);
    
//     const words = text.split(/\W+/)
//       .filter(word => word.length > 3 && !stopWords.has(word));
    
//     const keywordFrequency = {};
//     words.forEach(word => {
//       keywordFrequency[word] = (keywordFrequency[word] || 0) + 1;
//     });
    
//     return {
//       keywords: Object.keys(keywordFrequency)
//         .sort((a, b) => keywordFrequency[b] - keywordFrequency[a])
//         .slice(0, 5)
//     };
//   };

//   const handlePageChange = (newPage) => {
//     if (newPage > 0 && newPage <= Math.ceil(totalResults / pageSize)) {
//       handleSearch(searchQuery, newPage);
//       window.scrollTo({ top: 0, behavior: 'smooth' });
//     }
//   };

//   const fetchNews = async () => {
//     try {
//       const response = await API.get('/api/news/proxy/newsapi', {
//         params: {
//           endpoint: 'top-headlines',
//           country: 'us'
//         }
//       });
//       setNews(response.data.articles);
//     } catch (err) {
//       setError('Ошибка при загрузке новостей');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSearch = async (query, page = 1) => {
//     if (!query.trim()) {
//       setSearchResults([]);
//       setTotalResults(0);
//       return;
//     }

//     setIsSearching(true);
//     try {
//       const response = await API.get('/api/news/proxy/newsapi', {
//         params: {
//           endpoint: 'everything',
//           q: query,
//           page,
//           pageSize: pageSize
//         }
//       });
      
//       if (response.data?.articles) {
//         setSearchResults(response.data.articles);
//         setTotalResults(response.data.totalResults);
//         setCurrentPage(page);
//       } else {
//         setSearchResults([]);
//         setTotalResults(0);
//       }
//     } catch (err) {
//       console.error('Search error:', err);
//       setSearchResults([]);
//       setTotalResults(0);
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   const handleSearchChange = (e) => {
//     const query = e.target.value;
//     setSearchQuery(query);
//     setCurrentPage(1);

//     if (searchTimeout) {
//       clearTimeout(searchTimeout);
//     }

//     if (query.length > 2) {
//       const timeoutId = setTimeout(() => {
//         handleSearch(query, 1);
//       }, 2000);
      
//       setSearchTimeout(timeoutId);
//     } else {
//       setSearchResults([]);
//       setTotalResults(0);
//     }
//   };

//   useEffect(() => {
//     return () => {
//       if (searchTimeout) {
//         clearTimeout(searchTimeout);
//       }
//     };
//   }, [searchTimeout]);

//   const categorizeContent = (title = '', description = '') => {
//     const text = `${title} ${description}`.toLowerCase();
//     const categories = [];
    
//     if (/(tech|ai|robot|computer|software)/.test(text)) categories.push('technology');
//     if (/(business|market|economy|stock)/.test(text)) categories.push('business');
//     if (/(science|research|space|medicine)/.test(text)) categories.push('science');
//     if (/(politics|government|election)/.test(text)) categories.push('politics');
//     if (/(sport|football|basketball)/.test(text)) categories.push('sports');
//     if (/(game|gaming|esports|videogame|playstation|xbox|nintendo|steam|pc game)/.test(text)) categories.push('games');
    
//     return categories.length > 0 ? categories : ['general'];
//   };

//   const handleImageError = (index) => {
//     setNews(prevNews => prevNews.filter((_, i) => i !== index));
//   };

//   const handleRecImageError = (index) => {
//     setRecommendations(prevRecs => prevRecs.filter((_, i) => i !== index));
//   };

//   const fetchRecommendations = async () => {
//     try {
//       const userId = localStorage.getItem('userId');
//       if (!userId) return;
//       setLoadingRecs(true);
//       const journalResponse = await API.get(`/api/news/${userId}/journal`);
//       setJournalEntries(journalResponse.data);
//       const response = await API.get(`/api/news/recommendations/${userId}`, {
//         params: {
//           limit: recPageSize
//         }
//       });
//       if (response.data) {
//         const uniqueRecommendations = response.data.recommendations
//           .filter(item => !seenUrls.has(item.url));
//         setSeenUrls(prev => {
//           const newSet = new Set(prev);
//           uniqueRecommendations.forEach(item => newSet.add(item.url));
//           return newSet;
//         });
//         setRecommendations(uniqueRecommendations);
//       }
//     } catch (err) {
//       console.error('Ошибка загрузки рекомендаций:', err);
//     } finally {
//       setLoadingRecs(false);
//     }
//   };

//   const refreshRecommendations = () => {
//     setSeenUrls(new Set()); 
//   };

//   const handleAddToJournal = async (newsItem) => {
//     try {
//       const userId = localStorage.getItem('userId');
//       const token = localStorage.getItem('token');
//       if (!userId || !token) {
//         alert('Для добавления в журнал необходимо авторизоваться');
//         return;
//       }
//       const { keywords } = extractKeywords(newsItem.title, newsItem.description);
//       const categories = categorizeContent(newsItem.title, newsItem.description);
//       const entryData = {
//         userId,
//         url: newsItem.url,
//         source: newsItem.source?.name || 'unknown',
//         title: newsItem.title || '',
//         description: newsItem.description || '',
//         content: newsItem.content || newsItem.description || '',
//         imageUrl: newsItem.urlToImage || newsItem.imageUrl || '',
//         publishedAt: newsItem.publishedAt || new Date().toISOString(),
//         author: newsItem.author || '',
//         keywords,
//         categories
//       };
//       console.log('Отправляемые данные:', entryData);
//       await API.post('/api/news/journal', entryData, {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       });
//       alert('Новость успешно добавлена в журнал');
//       fetchRecommendations();
//     } catch (err) {
//       console.error('Ошибка добавления:', err);
//       alert(err.response?.data?.message || 'Ошибка при добавлении в журнал');
//     }
//   };

//   const handleGoToJournal = () => {
//     navigate('/journal');
//   };

//   useEffect(() => {
//     fetchNews();
//   }, []);

//   useEffect(() => {
//     fetchRecommendations();
//   }, []);

//   if (loading) return <div className="loading">Загрузка новостей...</div>;
//   if (error) return <div className="error">{error}</div>;

//   return (
//     <div className="news-feed">
//       <div className="news-feed-header">
//         <h2 className="news-feed-title">Новостная лента</h2>
//         <div className="search-container">
//           <input
//             type="text"
//             placeholder="Поиск новостей..."
//             value={searchQuery}
//             onChange={handleSearchChange}
//             className="search-input"
//           />
//           {isSearching && <div className="search-spinner">Загрузка...</div>}
//         </div>
//         <button 
//           onClick={handleGoToJournal}
//           className="journal-button"
//         >
//           Мой журнал
//         </button>
//       </div>
      
//       {searchResults.length > 0 ? (
//         <div className="search-results-section">
//           <h3 className="search-results-title">
//             Результаты поиска по запросу: "{searchQuery}" ({totalResults} найдено)
//           </h3>
//           <div className="news-grid">
//             {searchResults.map((newsItem, index) => (
//               <article key={`search-${index}-${Date.now()}`} className="news-card">
//                 {newsItem.urlToImage && (
//                   <div className="image-container">
//                     <img 
//                       src={newsItem.urlToImage} 
//                       alt={newsItem.title} 
//                       className="news-image"
//                       onError={() => handleImageError(index)}
//                     />
//                   </div>
//                 )}
//                 <div className="card-content">
//                   <h3 className="news-title">{newsItem.title}</h3>
//                   <p className="news-description">{newsItem.description}</p>
//                   <div className="card-footer">
//                     <a 
//                       href={newsItem.url} 
//                       target="_blank" 
//                       rel="noopener noreferrer"
//                       className="read-more"
//                     >
//                       Читать полностью
//                     </a>
//                     <div className="action-buttons">
//                       <button 
//                         onClick={() => handleAddToJournal(newsItem)}
//                         className="add-button"
//                       >
//                         Сохранить
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </article>
//             ))}
//           </div>
  
//           {totalResults > pageSize && (
//             <div className="pagination">
//               <button
//                 onClick={() => handlePageChange(currentPage - 1)}
//                 disabled={currentPage === 1 || isSearching}
//                 className="pagination-button"
//               >
//                 Назад
//               </button>
              
//               <div className="page-numbers">
//                 {Array.from({ length: Math.min(5, Math.ceil(totalResults / pageSize)) }, (_, i) => {
//                   let pageNum;
//                   if (Math.ceil(totalResults / pageSize) <= 5) {
//                     pageNum = i + 1;
//                   } else if (currentPage <= 3) {
//                     pageNum = i + 1;
//                   } else if (currentPage >= Math.ceil(totalResults / pageSize) - 2) {
//                     pageNum = Math.ceil(totalResults / pageSize) - 4 + i;
//                   } else {
//                     pageNum = currentPage - 2 + i;
//                   }
                  
//                   return (
//                     <button
//                       key={pageNum}
//                       onClick={() => handlePageChange(pageNum)}
//                       disabled={isSearching}
//                       className={`page-button ${currentPage === pageNum ? 'active' : ''}`}
//                     >
//                       {pageNum}
//                     </button>
//                   );
//                 })}
//               </div>
              
//               <button
//                 onClick={() => handlePageChange(currentPage + 1)}
//                 disabled={currentPage === Math.ceil(totalResults / pageSize) || isSearching}
//                 className="pagination-button"
//               >
//                 Вперед
//               </button>
//             </div>
//           )}
//         </div>
//       ) : (
//         <>
//           <div className="recommendations-section">
//             <div className="recommendations-header">
//               <h2 className="recommendations-title">
//                 Рекомендуем вам
//                 {loadingRecs && <span className="loading-indicator"> (загрузка...)</span>}
//               </h2>
//               <button 
//                 onClick={refreshRecommendations}
//                 className="refresh-button"
//                 disabled={loadingRecs}
//               >
//                 Показать другие
//               </button>
//             </div>
            
//             {!loadingRecs && recommendations.length === 0 ? (
//               <p className="no-recs">
//                 {journalEntries.length > 0 
//                   ? "Не удалось найти рекомендации. Попробуйте добавить больше новостей."
//                   : "Добавьте новости в журнал, чтобы получить рекомендации"}
//               </p>
//             ) : (
//               <>
//                 <div className="recommendations-grid">
//                   {recommendations.map((item, index) => (
//                     <article key={`rec-${index}`} className="recommendation-card">
//                       {item.imageUrl && (
//                         <div className="image-container">
//                           <img 
//                             src={getSafeImageUrl(item.imageUrl)} 
//                             alt={item.title}
//                             onError={() => handleRecImageError(index)}
//                           />
//                         </div>
//                       )}
//                       <div className="rec-content">
//                         <h3 className="rec-title">{item.title}</h3>
//                         <p className="rec-description">{item.description}</p>
//                         <div className="rec-footer">
//                           <a 
//                             href={item.url} 
//                             target="_blank" 
//                             rel="noopener noreferrer"
//                             className="rec-link"
//                           >
//                             Читать
//                           </a>
//                           <div className="rec-actions">
//                             <button 
//                               onClick={() => handleAddToJournal(item)}
//                               className="rec-add-button"
//                             >
//                               Сохранить
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     </article>
//                   ))}
//                 </div>
//               </>
//             )}
//           </div>
  
//           <div className="latest-news-section">
//             <h2 className="latest-news-title">Последние новости</h2>
            
//             {news.length === 0 ? (
//               <p className="no-news">Нет доступных новостей</p>
//             ) : (
//               <div className="news-grid">
//                 {news.map((newsItem, index) => (
//                   <article key={`${newsItem.source?.id || index}-${index}`} className="news-card">
//                     {newsItem.urlToImage && (
//                       <div className="image-container">
//                         <img 
//                           src={newsItem.urlToImage} 
//                           alt={newsItem.title} 
//                           className="news-image"
//                           onError={() => handleImageError(index)}
//                         />
//                       </div>
//                     )}
//                     <div className="card-content">
//                       <h3 className="news-title">{newsItem.title}</h3>
//                       <p className="news-description">{newsItem.description}</p>
//                       <div className="card-footer">
//                         <a 
//                           href={newsItem.url} 
//                           target="_blank" 
//                           rel="noopener noreferrer"
//                           className="read-more"
//                         >
//                           Читать полностью
//                         </a>
//                         <div className="action-buttons">
//                           <button 
//                             onClick={() => handleAddToJournal(newsItem)}
//                             className="add-button"
//                           >
//                             Сохранить
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                   </article>
//                 ))}
//               </div>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// export default NewsFeed;


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchNews from './SearchNews';
import Recommendations from './Recommendations';
import LatestNews from './LatestNews';
import './NewsFeed.css';

const NewsFeed = () => {
  const navigate = useNavigate();

  // --- Состояние поиска ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // --- Для рекомендаций и последних новостей ---
  const [recommendations, setRecommendations] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);


  const [currentPage, setCurrentPage] = useState(1);

  // --- Функция извлечения ключевых слов ---
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

  // --- Категоризация ---
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

  // --- Добавление в журнал ---
  const handleAddToJournal = async (newsItem) => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!userId || !token) {
      alert('Авторизуйтесь для добавления в журнал');
      return;
    }

    const entry = {
      userId,
      url: newsItem.url,
      source: newsItem.source?.name || 'unknown',
      title: newsItem.title || '',
      description: newsItem.description || '',
      content: newsItem.content || newsItem.description || '',
      imageUrl: newsItem.urlToImage || newsItem.imageUrl || '',
      publishedAt: newsItem.publishedAt || new Date().toISOString(),
      author: newsItem.author || '',
      keywords: extractKeywords(newsItem.title, newsItem.description).keywords,
      categories: categorizeContent(newsItem.title, newsItem.description)
    };

    try {
      await fetch('/api/news/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(entry)
      });
      alert('Сохранено в журнал');
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении');
    }
  };

  // --- Загрузка рекомендаций ---
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoadingRecs(true);
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const res = await fetch(`/api/news/recommendations/${userId}`);
        const data = await res.json();
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error('Ошибка загрузки рекомендаций:', err);
      } finally {
        setLoadingRecs(false);
      }
    };
    fetchRecommendations();
  }, []);

  // --- Загрузка последних новостей ---
  useEffect(() => {
    const fetchLatestNews = async () => {
      setLoadingNews(true);
      try {
        const res = await fetch('/api/news/proxy/newsapi', {
          params: {
            endpoint: 'top-headlines',
            country: 'us'
          }
        });
        const data = await res.json();
        if (data.articles) {
          setLatestNews(data.articles);
        }
      } catch (err) {
        console.error('Ошибка загрузки новостей:', err);
      } finally {
        setLoadingNews(false);
      }
    };
    fetchLatestNews();
  }, []);

  // --- Обработчик поиска ---
  const handleSearch = async (searchQuery, page = 1) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/news/search?q=${encodeURIComponent(searchQuery)}&page=${page}&pageSize=${pageSize}`);
      const data = await response.json();
      setSearchResults(data.articles || []);
      setTotalResults(data.totalResults || 0);
      setPage(page);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsSearching(false);
    }
  };

  // --- Обработчик изменения строки поиска ---
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setPage(1);

    if (value.length > 2) {
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => {
        handleSearch(value, 1);
      }, 2000);
    } else {
      setSearchResults([]);
    }
  };

  // --- Обработчик смены страницы ---
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > Math.ceil(totalResults / pageSize)) return;
    handleSearch(searchQuery, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

   const handleResultsChange = ({ results, totalResults, isSearching }) => {
    setSearchResults(results);
    setTotalResults(totalResults);
    setIsSearching(isSearching);
    setCurrentPage(1);
  };

  return (
    <div>
      <button onClick={() => navigate('/journal')} className="journal-button">
        Мой журнал
      </button>

      <SearchNews
        onAddToJournal={handleAddToJournal}
        extractKeywords={extractKeywords}
        categorizeContent={categorizeContent}
        onResultsChange={handleResultsChange}
      />

      {!isSearching && searchResults.length === 0 && (
        <>
          <Recommendations />
          <LatestNews />
        </>
      )}
    </div>
  );
};

export default NewsFeed;