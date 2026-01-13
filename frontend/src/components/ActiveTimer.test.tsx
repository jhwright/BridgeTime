import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../test/utils';
import { ActiveTimer } from './ActiveTimer';
import type { TimeEntryDetail } from '../types';

describe('ActiveTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockEntry: TimeEntryDetail = {
    id: 1,
    employee: 1,
    employee_name: 'John Doe',
    job_category: 1,
    job_code: null,
    job_display_name: 'Kitchen',
    start_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    end_time: null,
    duration_seconds: 3600,
    is_active: true,
    activity_tags: [],
    is_interruption: false,
    interrupted_entry: null,
    is_paused: false,
    interruption_reason: '',
    description: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    job_category_detail: null,
    job_code_detail: null,
    paused_entry: null,
    photos: [],
  };

  it('displays job name', () => {
    render(<ActiveTimer entry={mockEntry} />);
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
  });

  it('displays formatted duration', () => {
    vi.setSystemTime(new Date(Date.now()));
    render(<ActiveTimer entry={mockEntry} />);
    // Should show approximately 1 hour
    expect(screen.getByText(/1:00/)).toBeInTheDocument();
  });

  it('shows interruption badge when is_interruption is true', () => {
    const interruptionEntry = {
      ...mockEntry,
      is_interruption: true,
      interruption_reason: 'Emergency repair',
    };

    render(<ActiveTimer entry={interruptionEntry} />);
    expect(screen.getByText('INTERRUPTION')).toBeInTheDocument();
    expect(screen.getByText(/Emergency repair/)).toBeInTheDocument();
  });

  it('applies interruption class when is_interruption is true', () => {
    const interruptionEntry = {
      ...mockEntry,
      is_interruption: true,
    };

    const { container } = render(<ActiveTimer entry={interruptionEntry} />);
    expect(container.querySelector('.interruption')).toBeInTheDocument();
  });
});
