import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NewsPage from './pages/NewsPage';
import UserJournal from './components/UserJournal';



function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/news" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/journal" element={<UserJournal />} />
    </Routes>
  );
}

export default App;
