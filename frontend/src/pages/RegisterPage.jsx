// pages/RegisterPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import AuthForm from '../components/AuthForm';

const RegisterPage = () => {
  const navigate = useNavigate();

  const handleRegister = async (data) => {
    try {
      await API.post('/api/auth/register', data);
      alert('Регистрация успешна');
      navigate('/login');
    } catch (err) {
      alert('Ошибка регистрации: ' + (err.response?.data?.message || 'попробуйте снова'));
    }
  };

  return (
    <>
      <h2>Регистрация</h2>
      <AuthForm type="register" onSubmit={handleRegister} />
    </>
  );
};

export default RegisterPage;