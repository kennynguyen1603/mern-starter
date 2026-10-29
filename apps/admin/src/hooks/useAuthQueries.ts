import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loginApi, logoutApi } from '@/api/auth.api';
import { getMeApi } from '@/api/user.api';
import { useAuthStore } from '@/store/auth.store';
import { scheduleTokenRefresh, clearTokenRefresh } from '@/lib/tokenRefresh';

export const CURRENT_USER_KEY = 'currentUser';

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: [CURRENT_USER_KEY],
    queryFn: async () => {
      const res = await getMeApi();
      setUser(res.data.data);
      scheduleTokenRefresh();
      return res.data.data;
    },
    staleTime: Infinity,
    retry: false,
  });
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (res) => {
      const user = res.data.data.user;
      setUser(user);
      queryClient.setQueryData([CURRENT_USER_KEY], user);
      scheduleTokenRefresh();
    },
  });
}

export function useLogout() {
  const clearUser = useAuthStore((s) => s.clearUser);
  const queryClient = useQueryClient();

  const reset = () => {
    clearTokenRefresh();
    clearUser();
    queryClient.clear();
  };

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: reset,
    onError: reset,
  });
}
