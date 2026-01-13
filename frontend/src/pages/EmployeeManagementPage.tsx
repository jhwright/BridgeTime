import { useState, useEffect } from 'react';
import {
  adminListEmployees,
  adminAddEmployee,
  adminSetPin,
  adminDeleteEmployee,
  type AdminEmployee,
} from '../api/client';

const ADMIN_KEY_STORAGE = 'bridgetime-admin-key';

export function EmployeeManagementPage() {
  const [apiKey, setApiKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add employee form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ first_name: '', last_name: '', email: '', pin: '' });
  const [addError, setAddError] = useState<string | null>(null);

  // Set PIN modal
  const [pinModal, setPinModal] = useState<{ employeeId: number; name: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Check for stored key on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (storedKey) {
      setApiKey(storedKey);
      setIsAuthenticated(true);
    }
  }, []);

  // Load employees when authenticated
  useEffect(() => {
    if (isAuthenticated && apiKey) {
      loadEmployees();
    }
  }, [isAuthenticated, apiKey]);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListEmployees(apiKey);
      setEmployees(data);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.includes('401') || message.includes('403')) {
        handleLogout();
        setAuthError('Invalid password');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      // Try to list employees with the provided key
      await adminListEmployees(passwordInput);
      // If successful, store the key
      localStorage.setItem(ADMIN_KEY_STORAGE, passwordInput);
      setApiKey(passwordInput);
      setIsAuthenticated(true);
      setPasswordInput('');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.includes('401') || message.includes('403')) {
        setAuthError('Invalid password');
      } else if (message.includes('503')) {
        setAuthError('Admin API not configured on server');
      } else {
        setAuthError(message);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setApiKey('');
    setIsAuthenticated(false);
    setEmployees([]);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!newEmployee.first_name || !newEmployee.last_name) {
      setAddError('First and last name are required');
      return;
    }

    if (newEmployee.pin && (!/^\d{4,10}$/.test(newEmployee.pin))) {
      setAddError('PIN must be 4-10 digits');
      return;
    }

    try {
      await adminAddEmployee(apiKey, {
        first_name: newEmployee.first_name,
        last_name: newEmployee.last_name,
        email: newEmployee.email || undefined,
        pin: newEmployee.pin || undefined,
      });
      setNewEmployee({ first_name: '', last_name: '', email: '', pin: '' });
      setShowAddForm(false);
      loadEmployees();
    } catch (err: unknown) {
      setAddError(getErrorMessage(err));
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinModal) return;

    setPinError(null);

    if (!/^\d{4,10}$/.test(newPin)) {
      setPinError('PIN must be 4-10 digits');
      return;
    }

    try {
      await adminSetPin(apiKey, pinModal.employeeId, newPin);
      setPinModal(null);
      setNewPin('');
      loadEmployees();
    } catch (err: unknown) {
      setPinError(getErrorMessage(err));
    }
  };

  const handleDelete = async (employee: AdminEmployee) => {
    if (!confirm(`Delete ${employee.full_name}? This cannot be undone.`)) {
      return;
    }

    try {
      await adminDeleteEmployee(apiKey, employee.id);
      loadEmployees();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="employee-management">
        <h1>Employee Management</h1>
        <div className="admin-login">
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="admin-password">Admin Password</label>
              <input
                id="admin-password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {authError && <div className="error-message">{authError}</div>}
            <button type="submit" className="btn btn-primary">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-management">
      <div className="page-header">
        <h1>Employee Management</h1>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="actions-bar">
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          Add Employee
        </button>
        <button className="btn btn-secondary" onClick={loadEmployees} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Add Employee Form */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Employee</h2>
            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label htmlFor="first-name">First Name *</label>
                <input
                  id="first-name"
                  type="text"
                  value={newEmployee.first_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="last-name">Last Name *</label>
                <input
                  id="last-name"
                  type="text"
                  value={newEmployee.last_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pin">PIN (4-10 digits)</label>
                <input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={newEmployee.pin}
                  onChange={(e) => setNewEmployee({ ...newEmployee, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Optional"
                />
              </div>
              {addError && <div className="error-message">{addError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set PIN Modal */}
      {pinModal && (
        <div className="modal-overlay" onClick={() => setPinModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Set PIN for {pinModal.name}</h2>
            <form onSubmit={handleSetPin}>
              <div className="form-group">
                <label htmlFor="new-pin">New PIN (4-10 digits)</label>
                <input
                  id="new-pin"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
              {pinError && <div className="error-message">{pinError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPinModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Set PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee List */}
      <table className="employee-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>PIN</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.full_name}</td>
              <td>{emp.email || '-'}</td>
              <td>
                <span className={`pin-status ${emp.has_pin ? 'has-pin' : 'no-pin'}`}>
                  {emp.has_pin ? 'Set' : 'Not Set'}
                </span>
              </td>
              <td>
                <span className={`status ${emp.is_active ? 'active' : 'inactive'}`}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPinModal({ employeeId: emp.id, name: emp.full_name })}
                >
                  Set PIN
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(emp)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {employees.length === 0 && !loading && (
            <tr>
              <td colSpan={5} className="no-data">No employees found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    if ('response' in err) {
      const response = err as { response?: { data?: { error?: string }; status?: number } };
      if (response.response?.data?.error) {
        return response.response.data.error;
      }
      if (response.response?.status) {
        return `Error ${response.response.status}`;
      }
    }
    if ('message' in err) {
      return (err as { message: string }).message;
    }
  }
  return 'An error occurred';
}
