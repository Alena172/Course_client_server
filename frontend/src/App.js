import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NewsPage from './pages/NewsPage';
import UserJournal from './components/UserJournal';
import AllNewsPage from './pages/AllNewsPage';
import Navbar from './components/Navbar';

function App() {
  return (
    <>
      <Navbar /> 
      <Routes>
        <Route path="/" element={<Navigate to="/news" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/journal" element={<UserJournal />} />
        <Route path="/allnews" element={<AllNewsPage />} />
        <Route path="*" element={<Navigate to="/news"/>} />
      </Routes>
    </>
  );
}

export default App;