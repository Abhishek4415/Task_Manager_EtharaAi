import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAttendanceStore } from '../store/attendanceStore';
import { getErrorMessage } from '../lib/utils';

export const useTodayAttendance = () => {
  const { setTodayRecord } = useAttendanceStore();
  return useQuery({
    queryKey: ['attendance-today'],
    queryFn: () =>
      api.get('/attendance/today').then((r) => {
        setTodayRecord(r.data.data);
        return r.data.data;
      }),
    refetchInterval: 60_000,
  });
};

export const useAttendanceHistory = (params?: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ['attendance', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.from) p.set('from', params.from);
      if (params?.to) p.set('to', params.to);
      return api.get(`/attendance?${p.toString()}`).then((r) => r.data.data);
    },
  });

export const useHolidays = (params?: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ['holidays', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.from) p.set('from', params.from);
      if (params?.to) p.set('to', params.to);
      return api.get(`/holidays?${p.toString()}`).then((r) => r.data.data);
    },
  });

export const useAttendanceReport = (params?: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ['attendance-report', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.from) p.set('from', params.from);
      if (params?.to) p.set('to', params.to);
      return api.get(`/attendance/report?${p.toString()}`).then((r) => r.data.data);
    },
  });

export const usePunchIn = () => {
  const { punchIn } = useAttendanceStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/attendance/punch-in').then((r) => r.data),
    onSuccess: (res) => {
      punchIn(res.data);
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success('Punched in! Have a great day 🚀');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const usePunchOut = () => {
  const { punchOut } = useAttendanceStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/attendance/punch-out').then((r) => r.data),
    onSuccess: (res) => {
      punchOut(res.data);
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success('Punched out! Great work today ✅');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};
