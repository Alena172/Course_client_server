// PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  console.log('PrivateRoute: isAuthenticated =', isAuthenticated); // 🔍 Лог для отладки

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;