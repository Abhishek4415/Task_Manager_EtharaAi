import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../lib/utils';
import type { LoginInput, RegisterInput } from '../lib/schemas';

export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: LoginInput) => api.post('/auth/login', data).then((r) => r.data),
    onSuccess: (res) => {
      setAuth(res.data.user, res.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useRegister = () => {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: RegisterInput) => api.post('/auth/register', data).then((r) => r.data),
    onSuccess: (res) => {
      setAuth(res.data.user, res.data.token);
      toast.success('Account created! Welcome to TaskTrack.');
      navigate('/dashboard');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useProjectLeads = () =>
  useQuery({
    queryKey: ['project-leads'],
    queryFn: () => api.get('/users/project-leads').then((r) => r.data.data),
  });

export const useQualityReviewers = (plId?: string) =>
  useQuery({
    queryKey: ['quality-reviewers', plId],
    queryFn: () => api.get(`/users/quality-reviewers?plId=${plId}`).then((r) => r.data.data),
    enabled: !!plId,
  });

export const useMe = () => {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
    enabled: !!token,
  });
};

export const useMyTeam = () =>
  useQuery({
    queryKey: ['my-team'],
    queryFn: () => api.get('/users/my-team').then((r) => r.data.data),
  });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/users/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-report'] });
      qc.invalidateQueries({ queryKey: ['my-team'] });
      toast.success('Member details updated!');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useProjectsByPL = (plId?: string) =>
  useQuery({
    queryKey: ['projects', 'by-pl', plId],
    queryFn: () => api.get(`/projects/by-pl/${plId}`).then((r) => r.data.data),
    enabled: !!plId,
  });
