import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getErrorMessage } from '../lib/utils';

export const useTaskEntries = (params?: { sessionId?: string; assigneeId?: string }) =>
  useQuery({
    queryKey: ['task-entries', params],
    queryFn: () => {
      const p = new URLSearchParams();
      if (params?.sessionId) p.set('sessionId', params.sessionId);
      if (params?.assigneeId) p.set('assigneeId', params.assigneeId);
      return api.get(`/task-entries?${p.toString()}`).then((r) => r.data.data);
    },
  });

export const useEntryLogs = (entryId: string) =>
  useQuery({
    queryKey: ['entry-logs', entryId],
    queryFn: () => api.get(`/task-entries/${entryId}/logs`).then((r) => r.data.data),
    enabled: !!entryId,
  });

export const useUpdateProgress = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      action,
      countDone,
      note,
    }: {
      entryId: string;
      action: string;
      countDone?: number;
      note?: string;
    }) =>
      api.put(`/task-entries/${entryId}/progress`, { action, countDone, note }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      qc.invalidateQueries({ queryKey: ['session-progress'] });
      toast.success('Progress updated!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useUpdateStemRow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      stemRowIndex,
      status,
      note,
    }: {
      entryId: string;
      stemRowIndex: number;
      status: 'DONE' | 'SKIPPED';
      note?: string;
    }) =>
      api.put(`/task-entries/${entryId}/stem-row`, { stemRowIndex, status, note }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-entries'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success('Task row updated!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useUpdateTimer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, action }: { entryId: string; action: 'START' | 'PAUSE' | 'STOP' }) =>
      api.put(`/task-entries/${entryId}/timer`, { action }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      qc.invalidateQueries({ queryKey: ['task-entries'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};
export const useReviewTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, status, note }: { entryId: string; status: 'APPROVED' | 'REJECTED'; note?: string }) =>
      api.put(`/task-entries/${entryId}/review`, { status, note }).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['task-entries'] });
      qc.invalidateQueries({ queryKey: ['team-progress'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
      toast.success(res.message);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};
