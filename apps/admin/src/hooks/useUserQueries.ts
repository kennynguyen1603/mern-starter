import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  deleteUserApi,
  getUsersApi,
  type ListUsersParams,
} from '@/api/user.api';

export function useUsers(params: ListUsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await getUsersApi(params);
      return res.data.data;
    },
    placeholderData: keepPreviousData,
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
