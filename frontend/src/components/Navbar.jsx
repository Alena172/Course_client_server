import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Проверяем авторизацию по наличию токена в localStorage
  const isAuthenticated = !!localStorage.getItem('token');

  const handleLogout = () => {
    // Очищаем данные авторизации
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Перенаправляем на страницу входа
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">NewsRec</div>
      <ul className="navbar-links">
        {!isAuthenticated && (
          <li className={location.pathname === '/login' ? 'active' : ''}>
            <Link to="/login">Вход</Link>
          </li>
        )}
        {isAuthenticated && (
          <li className={location.pathname === '/news' ? 'active' : ''}>
            <Link to="/news">Главная</Link>
          </li>
        )}
        {isAuthenticated && (
          <li className={location.pathname === '/journal' ? 'active' : ''}>
            <Link to="/journal">Журнал</Link>
          </li>
        )}
        <li className={location.pathname === '/allnews' ? 'active' : ''}>
          <Link to="/allnews">Все новости</Link>
        </li>
        {isAuthenticated && (
          <li>
            <button className="logout-button" onClick={handleLogout}>
              Выйти
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;