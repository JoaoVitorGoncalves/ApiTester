import { ApiError } from './library';

export interface AuthUser {
  id: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  workspaceId: string;
}

export interface MeResponse {
  user: AuthUser;
  workspaceId: string;
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export async function registerApi(name: string, password: string): Promise<AuthResponse> {
  return authFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
}

export async function loginApi(name: string, password: string): Promise<AuthResponse> {
  return authFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
}

export async function meApi(token: string): Promise<MeResponse> {
  return authFetch<MeResponse>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}
