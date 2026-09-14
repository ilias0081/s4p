import { useMutation, useQuery } from '@tanstack/react-query';

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
  id: number;
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
  return useMutation({
    mutationFn: loginUser,
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
  return useMutation({
    mutationFn: logoutUser,
  });
}
