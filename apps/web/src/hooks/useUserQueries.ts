import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteUserApi,
  getAllUsersApi,
  getProfileApi,
  updateProfileApi,
} from '@/api/user.api';
import { useAuthStore } from '@/store/auth.store';
import { CURRENT_USER_KEY } from './useAuthQueries';

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      const res = await getProfileApi(id);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useUpdateProfile(id: string) {
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; avatar?: string }) =>
      updateProfileApi(id, data),
    onSuccess: (res) => {
      const updated = res.data.data;
      queryClient.setQueryData(['profile', id], updated);
      if (user?._id === id) {
        setUser(updated);
        queryClient.setQueryData([CURRENT_USER_KEY], updated);
      }
    },
  });
}

export function useAllUsers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await getAllUsersApi(params);
      return res.data.data;
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
