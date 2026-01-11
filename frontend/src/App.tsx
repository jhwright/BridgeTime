import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ClockPage } from './pages/ClockPage';
import { AdminPage } from './pages/AdminPage';
import './App.css';

function App() {
  const location = useLocation();

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Time Clock
        </Link>
        <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
          Admin
        </Link>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<ClockPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
