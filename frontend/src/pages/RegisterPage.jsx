import React from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import AuthForm from '../components/AuthForm';

const RegisterPage = () => {
  const navigate = useNavigate();

  const handleRegister = async (data) => {
    try {
      await API.post('/auth/register', data);
      alert('Регистрация прошла успешно!');
      navigate('/login');
    } catch (err) {
      alert('Ошибка регистрации: ' + err.response?.data?.message || 'неизвестная ошибка');
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
