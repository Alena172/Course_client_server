import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import axios from 'axios';
import './UserJournal.css';

const UserJournal = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJournal = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('Требуется авторизация');
        }
        const response = await API.get(`api/news/${userId}/journal`);
        const receivedData = Array.isArray(response.data) ? response.data : [];
        setEntries(receivedData.map(entry => ({
          ...entry,
          title: entry.title || 'Без названия',
          description: entry.description || 'Описание отсутствует',
          source: entry.source || 'unknown',
          publishedAt: entry.publishedAt || entry.createdAt,
          imageUrl: entry.imageUrl || '/placeholder-news.jpg'
        })));
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Ошибка загрузки журнала');
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJournal();
  }, []);

  const handleRemove = async (entryId) => {
    if (!window.confirm('Удалить эту новость из журнала?')) return;
    try {
      setLoading(true);
      const response = await API.delete(`api/news/journal/${entryId}`);
      setEntries(prev => prev.filter(e => e._id !== entryId));
      console.log('Новость удалена из журнала:', response.data);
    } catch (err) {
      console.error('Удаление не удалось:', {
        error: err,
        response: err.response?.data
      });
      alert(err.response?.data?.message || 'Не удалось удалить новость');
      try {
        const { data } = await API.get(`api/news/${localStorage.getItem('userId')}/journal`);
        setEntries(data);
      } catch (fetchErr) {
        console.error('Не удалось обновить:', fetchErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="journal-container">
      <div className="journal-header">
        <h2>Ваш журнал новостей</h2>
        <button 
          onClick={handleGoToHome}
          className="home-button"
        >
          ← На главную
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="empty">Нет сохраненных новостей</p>
      ) : (
        <div className="entries">
          {entries.map((entry, index) => (
            <div key={`journal-${index}`} className="entry">
              {entry.imageUrl && (
                <div className="image-wrapper">
                  <img 
                    src={entry.imageUrl} 
                    alt={entry.title}
                    onError={(e) => {
                      e.target.src = '/placeholder-news.jpg';
                      e.target.onerror = null;
                    }}
                  />
                </div>
              )}

              <div className="content">
                <div className="header">
                  <h3>{entry.title}</h3>
                  <span className="source">{entry.source}</span>
                </div>

                <p className="description">{entry.description}</p>

                <div className="footer">
                  <span className="date">
                    {new Date(entry.publishedAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>

                  <div className="actions">
                    <a 
                      href={entry.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link"
                    >
                      Читать
                    </a>
                    <button 
                      onClick={() => handleRemove(entry._id)}
                      className="delete-btn"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserJournal;