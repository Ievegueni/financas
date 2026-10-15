import { api } from './client';

export interface User {
  id: string;
  nome: string;
  email: string;
}

export const authApi = {
  me: () => api<{ user: User }>('/auth/me').then((r) => r.user),
  login: (email: string, password: string) =>
    api<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }).then(
      (r) => r.user,
    ),
  logout: () => api<{ ok: true }>('/auth/logout', { method: 'POST' }),
};
