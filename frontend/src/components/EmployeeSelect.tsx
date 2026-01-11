import { useEmployees } from '../hooks/useApi';
import type { Employee } from '../types';

interface EmployeeSelectProps {
  value: number | null;
  onChange: (employee: Employee | null) => void;
}

export function EmployeeSelect({ value, onChange }: EmployeeSelectProps) {
  const { data: employees, isLoading, error } = useEmployees();

  if (isLoading) {
    return <div className="loading">Loading employees...</div>;
  }

  if (error) {
    return <div className="error">Error loading employees</div>;
  }

  return (
    <div className="employee-select">
      <label htmlFor="employee">Select Employee</label>
      <select
        id="employee"
        value={value ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          const employee = employees?.find((emp) => emp.id === id) ?? null;
          onChange(employee);
        }}
      >
        <option value="">-- Select your name --</option>
        {employees?.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
