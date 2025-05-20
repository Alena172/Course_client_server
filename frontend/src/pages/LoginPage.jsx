// pages/LoginPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (formData) => {
    try {
      const response = await API.post('api/auth/login', {
        email: formData.email,
        password: formData.password
      });

      const user = response.data.user;
      const accessToken = response.data.accessToken;

      // Сохраняем токен и данные пользователя
      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      login(user); // обновляем контекст
      navigate('/news');

    } catch (err) {
      alert('Ошибка входа');
      console.error('Ошибка входа:', err.response?.data || err.message);
    }
  };

  return (
    <>
      <h2>Вход</h2>
      <AuthForm type="login" onSubmit={handleLogin} />
    </>
  );
};

export default LoginPage;