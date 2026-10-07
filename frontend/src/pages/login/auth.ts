import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '../../lib/api/api';

export type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type AuthResponse = {
  message: string;
  user: AuthUser;
};

export type SessionResponse = {
  user: AuthUser;
};

export async function getUserData(): Promise<{ user: AuthUser | null }> {
  return api.get('user-data').json<{ user: AuthUser | null }>();
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  return api.post(url, { json: body }).json<T>();
}

export async function signUpUser(input: SignUpInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('signup', input);
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('login', input);
}

export async function getCurrentUser(): Promise<SessionResponse> {
  return api.get('session').json<SessionResponse>();
}

export async function logoutUser(): Promise<void> {
  await api.post('logout');
}

export function useSignUp() {
  return useMutation({
    mutationFn: signUpUser,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(['session'], { user });
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getCurrentUser,
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
