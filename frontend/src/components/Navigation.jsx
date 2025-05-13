import { Link } from 'react-router-dom';

const Navigation = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <nav style={{ padding: '10px', backgroundColor: '#f5f5f5' }}>
      <Link to="/news" style={{ marginRight: '10px' }}>Новости</Link>
      {user && (
        <nav>
        <Link to="/journal">Мой журнал</Link>
      </nav>
      )}
      {user ? (
        <button onClick={handleLogout}>Выйти</button>
      ) : (
        <Link to="/login">Войти</Link>
      )}
    </nav>
  );
};

export default Navigation;