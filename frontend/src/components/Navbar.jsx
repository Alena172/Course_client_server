// Navbar.jsx
import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">NewsRec</div>
      <ul className="navbar-links">
        <li className={location.pathname === '/news' ? 'active' : ''}>
          <Link to="/news">Главная</Link>
        </li>
        <li className={location.pathname === '/journal' ? 'active' : ''}>
          <Link to="/journal">Журнал</Link>
        </li>
        <li className={location.pathname === '/allnews' ? 'active' : ''}>
          <Link to="/allnews">Все новости</Link>
        </li>

        {/* Кнопка выхода */}
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