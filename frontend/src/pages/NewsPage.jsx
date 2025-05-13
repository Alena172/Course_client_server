// import React, { useEffect, useState } from 'react';
// import API from '../api';
// import NewsForm from '../components/NewsForm';
// import NewsList from '../components/NewsList';
// import { useNavigate } from 'react-router-dom';

// const NewsPage = () => {
//   const [news, setNews] = useState([]);
//   const [recommendedNews, setRecommendedNews] = useState([]);
//   const [userId, setUserId] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user'))._id : null);
//   const navigate = useNavigate();

//   const fetchNews = async () => {
//     try {
//       const res = await API.get('/news');
//       setNews(res.data);
//     } catch (err) {
//       alert('Ошибка при загрузке новостей');
//     }
//   };

//   const fetchRecommendations = async () => {
//     if (!userId) return;

//     try {
//       const res = await API.get(`/news/recommendations/${userId}`);
//       setRecommendedNews(res.data);
//     } catch (err) {
//       alert('Ошибка при получении рекомендаций');
//     }
//   };

//   const handleAdd = async (article) => {
//     try {
//       await API.post('/news', article);
//       fetchNews();
//     } catch (err) {
//       alert('Не удалось добавить новость');
//     }
//   };

//   const handleDelete = async (id) => {
//     try {
//       await API.delete(`/news/${id}`);
//       fetchNews();
//     } catch (err) {
//       alert('Не удалось удалить новость');
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     localStorage.removeItem('user');
//     navigate('/login');
//   };

//   useEffect(() => {
//     fetchNews();
//     fetchRecommendations();
//   }, [userId]);

//   return (
//     <div style={{ maxWidth: 800, margin: 'auto' }}>
//       <h2>Новости</h2>
//       <button onClick={handleLogout}>Выйти</button>
//       <button onClick={() => API.get('/1/journal').catch(console.error)}>
//         Проверить доступ
//         </button>

//       <h3>Рекомендованные новости</h3>
//       <NewsList 
//         news={news} 
//         onDelete={handleDelete}
//         onAddToJournal={fetchRecommendations} // Обновляем рекомендации после добавления
//         showAddButton={true}
//         showDeleteButton={false}
//         />

//       <h3>Все новости</h3>
//       <NewsForm onAdd={handleAdd} />
//       <NewsList news={news} onDelete={handleDelete} userId={userId} />
//     </div>
    
//   );
// };

// export default NewsPage;


import React from 'react';
import NewsFeed from '../components/NewsFeed';

const NewsPage = () => {
  return (
    <div style={{ maxWidth: 800, margin: 'auto' }}>
      <h2>Новости</h2>
      <NewsFeed />
    </div>
  );
};

export default NewsPage;
