import type { WebhookEndpoint, WebhookReceipt, WebhookReceiptSummary } from '@core/types';
import { apiFetch } from './library';

export function webhookInboxUrl(webhookId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/api/webhooks/inbox/${webhookId}`;
}

export async function fetchWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  const { data } = await apiFetch<{ data: WebhookEndpoint[] }>('/api/webhooks');
  return data;
}

export async function createWebhookEndpoint(input: {
  name: string;
  generateSecret?: boolean;
  secret?: string | null;
}): Promise<{ endpoint: WebhookEndpoint; secret: string | null }> {
  const { data, secret } = await apiFetch<{ data: WebhookEndpoint; secret: string | null }>(
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
  const { data, secret } = await apiFetch<{ data: WebhookEndpoint; secret: string | null }>(
    `/api/webhooks/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return { endpoint: data, secret };
}

export async function deleteWebhookEndpoint(id: string): Promise<void> {
  await apiFetch(`/api/webhooks/${id}`, { method: 'DELETE' });
}

export async function fetchWebhookReceipts(webhookId?: string): Promise<WebhookReceiptSummary[]> {
  const qs = webhookId ? `?webhookId=${encodeURIComponent(webhookId)}` : '';
  const { data } = await apiFetch<{ data: WebhookReceiptSummary[] }>(`/api/webhooks/receipts${qs}`);
  return data;
}

export async function fetchWebhookReceipt(receiptId: string): Promise<WebhookReceipt> {
  const { data } = await apiFetch<{ data: WebhookReceipt }>(`/api/webhooks/receipts/${receiptId}`);
  return data;
}

export async function clearWebhookReceipts(webhookId?: string): Promise<void> {
  const qs = webhookId ? `?webhookId=${encodeURIComponent(webhookId)}` : '';
  await apiFetch(`/api/webhooks/receipts${qs}`, { method: 'DELETE' });
}
