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
  const [newEmployee, setNewEmployee] = useState({ name: '', pin: '' });
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

    const nameParts = newEmployee.name.trim().split(/\s+/);
    if (nameParts.length < 1 || !nameParts[0]) {
      setAddError('Name is required');
      return;
    }

    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';

    if (newEmployee.pin && (!/^\d{4,10}$/.test(newEmployee.pin))) {
      setAddError('PIN must be 4-10 digits');
      return;
    }

    try {
      console.log('Adding employee:', { first_name: firstName, last_name: lastName, pin: newEmployee.pin || undefined });
      const result = await adminAddEmployee(apiKey, {
        first_name: firstName,
        last_name: lastName,
        pin: newEmployee.pin || undefined,
      });
      console.log('Add employee result:', result);
      setNewEmployee({ name: '', pin: '' });
      setShowAddForm(false);
      loadEmployees();
    } catch (err: unknown) {
      console.error('Add employee error:', err);
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
          <div className="modal modal-compact" onClick={(e) => e.stopPropagation()}>
            <h2>Add Employee</h2>
            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label htmlFor="emp-name">Name</label>
                <input
                  id="emp-name"
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="First Last"
                  required
                  autoFocus
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
                  Add
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
      <table className="employee-table compact">
        <thead>
          <tr>
            <th>Name</th>
            <th>PIN</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.full_name}</td>
              <td>
                <span className={`pin-status ${emp.has_pin ? 'has-pin' : 'no-pin'}`}>
                  {emp.has_pin ? 'Set' : 'None'}
                </span>
              </td>
              <td className="actions">
                <button
                  className="btn btn-xs btn-secondary"
                  onClick={() => setPinModal({ employeeId: emp.id, name: emp.full_name })}
                >
                  PIN
                </button>
                <button
                  className="btn btn-xs btn-danger"
                  onClick={() => handleDelete(emp)}
                >
                  Del
                </button>
              </td>
            </tr>
          ))}
          {employees.length === 0 && !loading && (
            <tr>
              <td colSpan={3} className="no-data">No employees found</td>
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
