import type { WebhookEndpoint, WebhookReceipt, WebhookReceiptSummary } from '@core/types';
import { ApiError, libraryHeaders } from './library';

async function webhooksFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = libraryHeaders();
  if (init?.headers) {
    new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  }
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
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function webhookInboxUrl(webhookId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/webhooks/inbox/${webhookId}`;
}

export async function fetchWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  const { data } = await webhooksFetch<{ data: WebhookEndpoint[] }>('/api/webhooks');
  return data;
}

export async function createWebhookEndpoint(input: {
  name: string;
  generateSecret?: boolean;
  secret?: string | null;
}): Promise<{ endpoint: WebhookEndpoint; secret: string | null }> {
  const { data, secret } = await webhooksFetch<{ data: WebhookEndpoint; secret: string | null }>(
    '/api/webhooks',
    { method: 'POST', body: JSON.stringify(input) },
  );
  return { endpoint: data, secret };
}

export async function updateWebhookEndpoint(
  id: string,
  patch: {
    name?: string;
    enabled?: boolean;
    responseStatus?: number | null;
    responseBody?: string | null;
    secret?: string | null;
    clearSecret?: boolean;
    generateSecret?: boolean;
  },
): Promise<{ endpoint: WebhookEndpoint; secret: string | null }> {
  const { data, secret } = await webhooksFetch<{ data: WebhookEndpoint; secret: string | null }>(
    `/api/webhooks/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return { endpoint: data, secret: secret ?? null };
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await webhooksFetch(`/api/webhooks/${id}`, { method: 'DELETE' });
}

export async function fetchWebhookReceipts(webhookId?: string): Promise<WebhookReceiptSummary[]> {
  const qs = webhookId ? `?webhookId=${encodeURIComponent(webhookId)}` : '';
  const { data } = await webhooksFetch<{ data: WebhookReceiptSummary[] }>(`/api/webhooks/receipts${qs}`);
  return data;
}

export async function fetchWebhookReceipt(receiptId: string): Promise<WebhookReceipt> {
  const { data } = await webhooksFetch<{ data: WebhookReceipt }>(`/api/webhooks/receipts/${receiptId}`);
  return data;
}

export async function clearWebhookReceipts(webhookId?: string): Promise<void> {
  const qs = webhookId ? `?webhookId=${encodeURIComponent(webhookId)}` : '';
  await webhooksFetch(`/api/webhooks/receipts${qs}`, { method: 'DELETE' });
}
