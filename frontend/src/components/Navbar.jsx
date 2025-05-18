import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">Новостной Агрегатор</div>
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
      </ul>
    </nav>
  );
};

export default Navbar;