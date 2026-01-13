import { useState } from 'react';
import { useJobCategories } from '../hooks/useApi';
import type { Role, JobCode } from '../types';

export interface RoleSelection {
  role: Role;
  jobCode: JobCode | null;
}

interface RoleSelectProps {
  onSelect: (selection: RoleSelection) => void;
  disabled?: boolean;
}

export function RoleSelect({ onSelect, disabled }: RoleSelectProps) {
  const { data: roles, isLoading, error } = useJobCategories();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  if (isLoading) {
    return <div className="loading">Loading roles...</div>;
  }

  if (error) {
    return <div className="error">Error loading roles</div>;
  }

  const handleRoleSelect = (roleId: number) => {
    const role = roles?.find((r) => r.id === roleId);
    if (!role) return;

    // If role has sub-jobs (like WRP), show second level
    if (role.job_codes.length > 0) {
      setSelectedRole(role);
    } else {
      // Direct selection for roles without sub-jobs
      onSelect({ role, jobCode: null });
    }
  };

  const handleJobCodeSelect = (jobCodeId: number) => {
    if (!selectedRole) return;

    const jobCode = selectedRole.job_codes.find((jc) => jc.id === jobCodeId);
    if (!jobCode) return;

    onSelect({ role: selectedRole, jobCode });
    setSelectedRole(null);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  // Show job codes if a role with sub-jobs is selected (e.g., WRP)
  if (selectedRole && selectedRole.job_codes.length > 0) {
    return (
      <div className="role-select">
        <button className="back-button" onClick={handleBack} disabled={disabled}>
          Back
        </button>
        <h3>{selectedRole.name}</h3>
        <div className="role-grid">
          {selectedRole.job_codes.map((jobCode) => (
            <button
              key={jobCode.id}
              className="role-button"
              onClick={() => handleJobCodeSelect(jobCode.id)}
              disabled={disabled}
            >
              {jobCode.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show role grid
  return (
    <div className="role-select">
      <h3>Select a Role</h3>
      <div className="role-grid">
        {roles?.map((role) => (
          <button
            key={role.id}
            className="role-button"
            onClick={() => handleRoleSelect(role.id)}
            disabled={disabled}
          >
            {role.name}
            {role.job_codes.length > 0 && <span className="has-children"></span>}
          </button>
        ))}
      </div>
    </div>
  );
}
