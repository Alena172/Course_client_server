import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

  useEffect(() => {
    console.log('[ProtectedRoute] Токен:', token);
    console.log('[ProtectedRoute] Данные пользователя:', user);
  }, [token, user]);

  // Проверяем, есть ли токен и данные пользователя
  if (!token || !user) {
    console.log('[ProtectedRoute] Нет доступа, перенаправляем на /login');
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
