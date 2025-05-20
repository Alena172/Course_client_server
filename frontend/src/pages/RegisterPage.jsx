import React from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import AuthForm from '../components/AuthForm/AuthForm';

const RegisterPage = () => {
  const navigate = useNavigate();

  const handleRegister = async (data) => {
    try {
      await API.post('/api/auth/register', data);
      alert('Регистрация прошла успешно!');
      navigate('/login');
    } catch (err) {
      alert('Ошибка регистрации: ' + err.response?.data?.message || 'неизвестная ошибка');
    }
  };

  return (
    <>
      <AuthForm type="register" onSubmit={handleRegister} />
    </>
  );
};

export default RegisterPage;
