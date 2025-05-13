// import React from 'react';
// import API from '../api';

// const NewsList = ({ 
//   news, 
//   onDelete, 
//   onAddToJournal, 
//   showAddButton = true,
//   showDeleteButton = false 
// }) => {
//   const handleAddToJournal = async (newsId) => {
//     try {
//       const response = await API.post(`/news/journal/${newsId}`);
      
//       if (response.data.message === 'Новость добавлена в журнал') {
//         alert('Новость успешно добавлена в ваш журнал');
//         // Вызываем колбэк, если он передан
//         if (onAddToJournal) onAddToJournal();
//       }
//     } catch (err) {
//       if (err.response?.status === 401) {
//         alert('Для выполнения действия требуется авторизация');
//         window.location.href = '/login';
//       } else if (err.response?.status === 404) {
//         alert('Новость не найдена');
//       } else {
//         alert('Произошла ошибка при добавлении в журнал');
//         console.error('Journal error:', err.response?.data || err);
//       }
//     }
//   };

//   return (
//     <div>
//       {news.map((item) => (
//         <div key={item._id} style={{ 
//           border: '1px solid #ccc', 
//           marginBottom: '1rem', 
//           padding: '1rem',
//           borderRadius: '8px',
//           boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
//         }}>
//           <h3 style={{ marginTop: 0 }}>{item.title}</h3>
//           <p>{item.content}</p>
//           <p><strong>Теги:</strong> {item.tags?.join(', ') || 'нет тегов'}</p>
          
//           <div style={{ marginTop: '10px' }}>
//             {showAddButton && (
//               <button 
//                 onClick={() => handleAddToJournal(item._id)}
//                 style={{
//                   backgroundColor: '#4CAF50',
//                   color: 'white',
//                   marginRight: '10px',
//                   padding: '8px 16px',
//                   border: 'none',
//                   borderRadius: '4px',
//                   cursor: 'pointer'
//                 }}
//               >
//                 Добавить в журнал
//               </button>
//             )}
            
//             {showDeleteButton && (
//               <button 
//                 onClick={() => onDelete(item._id)}
//                 style={{
//                   backgroundColor: '#f44336',
//                   color: 'white',
//                   padding: '8px 16px',
//                   border: 'none',
//                   borderRadius: '4px',
//                   cursor: 'pointer'
//                 }}
//               >
//                 Удалить из журнала
//               </button>
//             )}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default NewsList;