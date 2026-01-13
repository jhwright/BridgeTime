import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { ClockPage } from './pages/ClockPage';
import { AdminPage } from './pages/AdminPage';
import { InsightsPage } from './pages/InsightsPage';
import { EmployeeManagementPage } from './pages/EmployeeManagementPage';
import { useCurrentEmployee } from './hooks/useCurrentEmployee';
import './App.css';

function App() {
  const location = useLocation();
  const { currentEmployee } = useCurrentEmployee();

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Clock
          </Link>
          <Link to="/insights" className={location.pathname === '/insights' ? 'active' : ''}>
            Insights
          </Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>
            Admin
          </Link>
          <Link to="/employees" className={location.pathname === '/employees' ? 'active' : ''}>
            Employees
          </Link>
        </div>
        {currentEmployee && (
          <div className="nav-user">
            <span className="user-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </span>
            {currentEmployee.full_name}
          </div>
        )}
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<ClockPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/employees" element={<EmployeeManagementPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
