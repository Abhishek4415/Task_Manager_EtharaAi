export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export const formatTime = (date: string | Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateShort = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const todayISO = (): string => new Date().toISOString().split('T')[0];

export const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    TODO: 'var(--color-text-subtle)',
    IN_PROGRESS: 'var(--color-warning)',
    DONE: 'var(--color-success)',
    PARTIAL: 'var(--color-info)',
    SKIPPED: 'var(--color-danger)',
    PENDING: 'var(--color-warning)',
    QR_PENDING: 'var(--color-warning)',
    PL_PENDING: 'var(--color-info)',
    APPROVED: 'var(--color-success)',
    REJECTED: 'var(--color-danger)',
  };
  return map[status] || 'var(--color-text-muted)';
};

export const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
    PARTIAL: 'Partial',
    SKIPPED: 'Skipped',
    PENDING: 'Pending',
    QR_PENDING: 'Pending QR Approval',
    PL_PENDING: 'Pending PL Approval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ACTIVE: 'Active',
  };
  return map[status] || status;
};

export const roleLabel = (role: string): string => {
  const map: Record<string, string> = {
    PROJECT_LEAD: 'Project Lead',
    QUALITY_REVIEWER: 'QR',
    TASKER: 'Tasker',
  };
  return map[role] || role;
};

export const roleColor = (role: string): string => {
  const map: Record<string, string> = {
    PROJECT_LEAD: '#a78bfa',
    QUALITY_REVIEWER: 'var(--color-info)',
    TASKER: 'var(--color-teal)',
  };
  return map[role] || 'var(--color-text-muted)';
};

export const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const e = err as { response?: { data?: { message?: string } } };
    return e.response?.data?.message || 'An error occurred';
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred';
};
