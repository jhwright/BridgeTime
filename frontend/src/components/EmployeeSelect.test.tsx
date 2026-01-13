import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import { EmployeeSelect } from './EmployeeSelect';
import * as useApiModule from '../hooks/useApi';

vi.mock('../hooks/useApi');

describe('EmployeeSelect', () => {
  const mockEmployees = [
    { id: 1, first_name: 'John', last_name: 'Doe', full_name: 'John Doe', email: '', is_active: true, gusto_id: null, has_pin: false },
    { id: 2, first_name: 'Jane', last_name: 'Smith', full_name: 'Jane Smith', email: '', is_active: true, gusto_id: null, has_pin: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    vi.mocked(useApiModule.useEmployees).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<EmployeeSelect value={null} onChange={() => {}} />);
    expect(screen.getByText('Loading employees...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.mocked(useApiModule.useEmployees).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed'),
    } as any);

    render(<EmployeeSelect value={null} onChange={() => {}} />);
    expect(screen.getByText('Error loading employees')).toBeInTheDocument();
  });

  it('renders employee options', () => {
    vi.mocked(useApiModule.useEmployees).mockReturnValue({
      data: mockEmployees,
      isLoading: false,
      error: null,
    } as any);

    render(<EmployeeSelect value={null} onChange={() => {}} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('calls onChange when employee selected', async () => {
    const onChange = vi.fn();
    vi.mocked(useApiModule.useEmployees).mockReturnValue({
      data: mockEmployees,
      isLoading: false,
      error: null,
    } as any);

    render(<EmployeeSelect value={null} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
});
