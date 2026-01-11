import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import { JobSelect } from './JobSelect';
import * as useApiModule from '../hooks/useApi';

vi.mock('../hooks/useApi');

describe('JobSelect', () => {
  const mockCategories = [
    {
      id: 1,
      name: 'Kitchen',
      alias: '',
      is_active: true,
      job_codes: [],
    },
    {
      id: 2,
      name: 'WRP',
      alias: '3',
      is_active: true,
      job_codes: [
        { id: 1, name: 'HEN - Hensley', alias: '31', is_active: true },
        { id: 2, name: 'Admin', alias: '40', is_active: true },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    vi.mocked(useApiModule.useJobCategories).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<JobSelect onSelect={() => {}} />);
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
  });

  it('renders categories', () => {
    vi.mocked(useApiModule.useJobCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<JobSelect onSelect={() => {}} />);

    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.getByText('WRP →')).toBeInTheDocument();
  });

  it('calls onSelect immediately for standalone category', () => {
    const onSelect = vi.fn();
    vi.mocked(useApiModule.useJobCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<JobSelect onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Kitchen'));

    expect(onSelect).toHaveBeenCalledWith({
      category: mockCategories[0],
      jobCode: null,
    });
  });

  it('shows job codes when category with sub-jobs is selected', () => {
    vi.mocked(useApiModule.useJobCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<JobSelect onSelect={() => {}} />);

    fireEvent.click(screen.getByText('WRP →'));

    expect(screen.getByText('HEN - Hensley')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('← Back to Categories')).toBeInTheDocument();
  });

  it('calls onSelect with job code when selected', () => {
    const onSelect = vi.fn();
    vi.mocked(useApiModule.useJobCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<JobSelect onSelect={onSelect} />);

    fireEvent.click(screen.getByText('WRP →'));
    fireEvent.click(screen.getByText('HEN - Hensley'));

    expect(onSelect).toHaveBeenCalledWith({
      category: mockCategories[1],
      jobCode: mockCategories[1].job_codes[0],
    });
  });

  it('goes back to categories when back button is clicked', () => {
    vi.mocked(useApiModule.useJobCategories).mockReturnValue({
      data: mockCategories,
      isLoading: false,
      error: null,
    } as any);

    render(<JobSelect onSelect={() => {}} />);

    fireEvent.click(screen.getByText('WRP →'));
    expect(screen.getByText('HEN - Hensley')).toBeInTheDocument();

    fireEvent.click(screen.getByText('← Back to Categories'));
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    expect(screen.queryByText('HEN - Hensley')).not.toBeInTheDocument();
  });
});
