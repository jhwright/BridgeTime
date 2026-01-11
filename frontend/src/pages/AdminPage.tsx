import { useState } from 'react';
import {
  useEmployees,
  useJobCategories,
  useTimeEntries,
  useDeleteTimeEntry,
} from '../hooks/useApi';

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

export function AdminPage() {
  const [filters, setFilters] = useState({
    employee: '',
    job_category: '',
    start_date: '',
    end_date: '',
  });

  const { data: employees } = useEmployees();
  const { data: categories } = useJobCategories();
  const { data: entries, isLoading } = useTimeEntries({
    employee: filters.employee ? Number(filters.employee) : undefined,
    job_category: filters.job_category ? Number(filters.job_category) : undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
  });
  const deleteEntry = useDeleteTimeEntry();

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this time entry?')) {
      await deleteEntry.mutateAsync(id);
    }
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="filter-employee">Employee</label>
          <select
            id="filter-employee"
            value={filters.employee}
            onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
          >
            <option value="">All Employees</option>
            {employees?.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-category">Job Category</label>
          <select
            id="filter-category"
            value={filters.job_category}
            onChange={(e) => setFilters({ ...filters, job_category: e.target.value })}
          >
            <option value="">All Categories</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-start">Start Date</label>
          <input
            id="filter-start"
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-end">End Date</label>
          <input
            id="filter-end"
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading time entries...</div>
      ) : (
        <table className="time-entries-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Job</th>
              <th>Description</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries?.map((entry) => (
              <tr key={entry.id} className={entry.is_interruption ? 'interruption-row' : ''}>
                <td>{entry.employee_name}</td>
                <td>{entry.job_display_name}</td>
                <td>{entry.description || '-'}</td>
                <td>{formatDateTime(entry.start_time)}</td>
                <td>{entry.end_time ? formatDateTime(entry.end_time) : '(Active)'}</td>
                <td>{formatDuration(entry.duration_seconds)}</td>
                <td>
                  {entry.is_interruption && <span className="badge">Interruption</span>}
                  {entry.is_paused && <span className="badge paused">Paused</span>}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleteEntry.isPending}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={8} className="no-data">
                  No time entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
