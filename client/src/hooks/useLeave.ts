import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import type { LeaveInput } from '../lib/schemas';

export const useMyLeave = () =>
  useQuery({
    queryKey: ['my-leave'],
    queryFn: () => api.get('/leave').then((r) => r.data.data),
  });

export const usePendingLeave = () =>
  useQuery({
    queryKey: ['pending-leave'],
    queryFn: () => api.get('/leave/pending').then((r) => r.data.data),
  });

export const useTeamLeave = () =>
  useQuery({
    queryKey: ['team-leave'],
    queryFn: () => api.get('/leave/team').then((r) => r.data.data),
  });

export const useLeaveCalendar = () =>
  useQuery({
    queryKey: ['leave-calendar'],
    queryFn: () => api.get('/leave/calendar').then((r) => r.data.data),
  });

export const useLeaveMemberAnalytics = (memberId?: string, params?: { month?: number; year?: number }) =>
  useQuery({
    queryKey: ['leave-member-analytics', memberId, params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.month) p.set('month', String(params.month));
      if (params?.year) p.set('year', String(params.year));
      return api.get(`/leave/analytics/member/${memberId}?${p.toString()}`).then((r) => r.data.data);
    },
    enabled: !!memberId,
  });

export const useSubmitLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LeaveInput) => api.post('/leave', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success('Leave request submitted!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useApproveLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) =>
      api.put(`/leave/${id}/approve`, { reviewNote }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-leave'] });
      qc.invalidateQueries({ queryKey: ['team-leave'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success('Leave approved');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useRejectLeave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote: string }) =>
      api.put(`/leave/${id}/reject`, { reviewNote }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-leave'] });
      qc.invalidateQueries({ queryKey: ['team-leave'] });
      qc.invalidateQueries({ queryKey: ['my-leave'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success('Leave rejected');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};
