import React from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import AuthForm from '../components/AuthForm/AuthForm';


const LoginPage = () => {
    const navigate = useNavigate();
  
    const handleLogin = async (formData) => {
      try {
        const response = await API.post('/api/auth/login', {
          email: formData.email,
          password: formData.password
        });
        console.log('USER DATA:', response.data.user);
        const user = response.data.user;
        const userId = user._id || user.id;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userId', userId);
        localStorage.setItem('token', response.data.token);
        alert('Вы успешно вошли!');
        window.location.href = '/news';
      } catch (err) {
        const errorMessage = err.response?.data?.message ||
                             err.response?.data?.error ||
                             'Ошибка при авторизации';
        alert(errorMessage);
        console.error('Ошибка входа:', err.response?.data || err);
      }
    };
    return (
      <>
        <AuthForm type="login" onSubmit={handleLogin} />
      </>
    );
  };

export default LoginPage;
