import type { Collection, HistoryEntry, SavedRequest } from '@core/types';
import { useAuth } from '../store/auth';
import { getOrCreateGuestWorkspaceId } from '../store/workspace';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function libraryHeaders(): Headers {
  const headers = new Headers();
  const auth = useAuth.getState();
  if (auth.mode === 'user' && auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  } else if (auth.mode === 'guest') {
    headers.set('X-ApiFlash-Mode', 'guest');
    headers.set('X-ApiFlash-Workspace', getOrCreateGuestWorkspaceId());
  }
  return headers;
}

export async function readApiError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = libraryHeaders();
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    throw new ApiError(await readApiError(res), res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const { data } = await apiFetch<{ data: HistoryEntry[] }>('/api/history');
  return data;
}

export async function postHistory(entry: HistoryEntry): Promise<void> {
  await apiFetch('/api/history', { method: 'POST', body: JSON.stringify(entry) });
}

export async function clearHistoryApi(): Promise<void> {
  await apiFetch('/api/history', { method: 'DELETE' });
}

export async function fetchCollections(): Promise<Collection[]> {
  const { data } = await apiFetch<{ data: Collection[] }>('/api/collections');
  return data;
}

export async function createCollectionApi(
  id: string,
  name: string,
  createdAt: number,
): Promise<Collection> {
  const { data } = await apiFetch<{ data: Collection }>('/api/collections', {
    method: 'POST',
    body: JSON.stringify({ id, name, createdAt }),
  });
  return data;
}

export async function renameCollectionApi(id: string, name: string): Promise<void> {
  await apiFetch(`/api/collections/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteCollectionApi(id: string): Promise<void> {
  await apiFetch(`/api/collections/${id}`, { method: 'DELETE' });
}

export async function addSavedRequestApi(collectionId: string, saved: SavedRequest): Promise<void> {
  await apiFetch(`/api/collections/${collectionId}/requests`, {
    method: 'POST',
    body: JSON.stringify(saved),
  });
}

export async function removeSavedRequestApi(collectionId: string, requestId: string): Promise<void> {
  await apiFetch(`/api/collections/${collectionId}/requests/${requestId}`, { method: 'DELETE' });
}

export async function checkDbHealth(): Promise<'ok' | 'down' | 'not_configured'> {
  try {
    const res = await fetch('/api/health');
    const body = (await res.json()) as { db?: string };
    if (body.db === 'ok') return 'ok';
    if (body.db === 'not_configured') return 'not_configured';
    return 'down';
  } catch {
    return 'down';
  }
}
