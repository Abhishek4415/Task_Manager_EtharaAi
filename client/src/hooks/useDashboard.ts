import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useDashboardToday = () =>
  useQuery({
    queryKey: ['dashboard-today'],
    queryFn: () => api.get('/dashboard/today').then((r) => r.data.data),
    refetchInterval: 3000,
  });

export const useTeamProgress = (params?: { date?: string; projectId?: string }) =>
  useQuery({
    queryKey: ['team-progress', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.date) p.set('date', params.date);
      if (params?.projectId) p.set('projectId', params.projectId);
      return api.get(`/dashboard/team-progress?${p.toString()}`).then((r) => r.data.data);
    },
    refetchInterval: 3000,
  });

export const useMonthlyReport = (params?: { month?: number; year?: number; from?: string; to?: string }) =>
  useQuery({
    queryKey: ['monthly-report', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.month) p.set('month', String(params.month));
      if (params?.year) p.set('year', String(params.year));
      if (params?.from) p.set('from', params.from);
      if (params?.to) p.set('to', params.to);
      return api.get(`/dashboard/monthly-report?${p.toString()}`).then((r) => r.data.data);
    },
    refetchInterval: 15000,
  });
