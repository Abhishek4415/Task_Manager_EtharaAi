import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';
import type { TodoSessionInput } from '../lib/schemas';

export const useTodoSessions = (params?: { date?: string; projectId?: string }) =>
  useQuery({
    queryKey: ['todo-sessions', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.date) p.set('date', params.date);
      if (params?.projectId) p.set('projectId', params.projectId);
      return api.get(`/todo-sessions?${p.toString()}`).then((r) => r.data.data);
    },
  });

export const useTodoSession = (id: string) =>
  useQuery({
    queryKey: ['todo-session', id],
    queryFn: () => api.get(`/todo-sessions/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

export const useSessionProgress = (id: string) =>
  useQuery({
    queryKey: ['session-progress', id],
    queryFn: () => api.get(`/todo-sessions/${id}/progress`).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 60_000,
  });

export const useCreateTodoSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TodoSessionInput) => api.post('/todo-sessions', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todo-sessions'] });
      toast.success('TODO session created!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useUploadStem = (sessionId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/todo-sessions/${sessionId}/upload-stem`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todo-session', sessionId] });
      toast.success('STEM file uploaded!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useDeleteTodoSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/todo-sessions/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['todo-sessions'] });
      qc.invalidateQueries({ queryKey: ['team-progress'] });
      qc.invalidateQueries({ queryKey: ['task-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      qc.invalidateQueries({ queryKey: ['session-progress'] });
      toast.success('Session deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};
