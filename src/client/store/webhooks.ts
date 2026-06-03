import { create } from 'zustand';
import type { WebhookEndpoint, WebhookReceipt, WebhookReceiptSummary } from '@core/types';
import { ApiError } from '../api/library';
import {
  clearWebhookReceipts,
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  fetchWebhookEndpoints,
  fetchWebhookReceipt,
  fetchWebhookReceipts,
  updateWebhookEndpoint,
} from '../api/webhooks';
import { useLibrary } from './library';

interface WebhooksState {
  endpoints: WebhookEndpoint[];
  receipts: WebhookReceiptSummary[];
  selectedWebhookId: string | null;
  selectedReceipt: WebhookReceipt | null;
  panelActive: boolean;
  polling: boolean;
  lastError: string | null;

  reset: () => void;
  init: () => Promise<void>;
  setPanelActive: (active: boolean) => void;
  selectWebhook: (id: string | null) => Promise<void>;
  selectReceipt: (id: string | null) => Promise<void>;
  refreshReceipts: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  createEndpoint: (name: string, generateSecret?: boolean) => Promise<{ secret: string | null }>;
  renameEndpoint: (id: string, name: string) => Promise<void>;
  toggleEndpoint: (id: string, enabled: boolean) => Promise<void>;
  updateEndpointSettings: (
    id: string,
    patch: {
      name?: string;
      enabled?: boolean;
      responseStatus?: number | null;
      responseBody?: string | null;
    },
  ) => Promise<void>;
  regenerateSecret: (id: string) => Promise<{ secret: string | null }>;
  clearSecret: (id: string) => Promise<void>;
  deleteEndpoint: (id: string) => Promise<void>;
  clearReceipts: (webhookId?: string) => Promise<void>;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollGen = 0;

export const useWebhooks = create<WebhooksState>((set, get) => ({
  endpoints: [],
  receipts: [],
  selectedWebhookId: null,
  selectedReceipt: null,
  panelActive: false,
  polling: false,
  lastError: null,

  reset: () => {
    get().stopPolling();
    set({
      endpoints: [],
      receipts: [],
      selectedWebhookId: null,
      selectedReceipt: null,
      panelActive: false,
      lastError: null,
    });
  },

  init: async () => {
    if (useLibrary.getState().dbStatus !== 'ok') return;
    try {
      const endpoints = await fetchWebhookEndpoints();
      set({ endpoints, lastError: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load webhooks.';
      set({ lastError: message });
    }
  },

  setPanelActive: (active) => {
    set({ panelActive: active });
    if (active) {
      get().startPolling();
    } else {
      get().stopPolling();
    }
  },

  selectWebhook: async (id) => {
    set({ selectedWebhookId: id, selectedReceipt: null });
    if (!id) {
      set({ receipts: [] });
      return;
    }
    await get().refreshReceipts();
  },

  selectReceipt: async (id) => {
    if (!id) {
      set({ selectedReceipt: null });
      return;
    }
    try {
      const receipt = await fetchWebhookReceipt(id);
      set({ selectedReceipt: receipt, lastError: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load receipt.';
      set({ lastError: message });
    }
  },

  refreshReceipts: async () => {
    if (useLibrary.getState().dbStatus !== 'ok') return;
    const { selectedWebhookId } = get();
    try {
      const receipts = await fetchWebhookReceipts(selectedWebhookId ?? undefined);
      set({ receipts, lastError: null });
      const selected = get().selectedReceipt;
      if (selected && receipts.some((r) => r.id === selected.id)) {
        await get().selectReceipt(selected.id);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load receipts.';
      set({ lastError: message });
    }
  },

  startPolling: () => {
    if (pollTimer) return;
    const gen = ++pollGen;
    set({ polling: true });
    pollTimer = setInterval(() => {
      if (gen !== pollGen) return;
      if (!get().panelActive) return;
      void get().refreshReceipts();
    }, 3000);
  },

  stopPolling: () => {
    pollGen += 1;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set({ polling: false });
  },

  createEndpoint: async (name, generateSecret = false) => {
    const { endpoint, secret } = await createWebhookEndpoint({ name, generateSecret });
    set((s) => ({ endpoints: [endpoint, ...s.endpoints], selectedWebhookId: endpoint.id }));
    void get().refreshReceipts();
    return { secret };
  },

  renameEndpoint: async (id, name) => {
    const { endpoint } = await updateWebhookEndpoint(id, { name: name.trim() });
    set((s) => ({
      endpoints: s.endpoints.map((e) => (e.id === id ? endpoint : e)),
    }));
  },

  toggleEndpoint: async (id, enabled) => {
    const { endpoint } = await updateWebhookEndpoint(id, { enabled });
    set((s) => ({
      endpoints: s.endpoints.map((e) => (e.id === id ? endpoint : e)),
    }));
  },

  updateEndpointSettings: async (id, patch) => {
    const { endpoint } = await updateWebhookEndpoint(id, patch);
    set((s) => ({
      endpoints: s.endpoints.map((e) => (e.id === id ? endpoint : e)),
    }));
  },

  regenerateSecret: async (id) => {
    const { endpoint, secret } = await updateWebhookEndpoint(id, { generateSecret: true });
    set((s) => ({
      endpoints: s.endpoints.map((e) => (e.id === id ? endpoint : e)),
    }));
    return { secret };
  },

  clearSecret: async (id) => {
    const { endpoint } = await updateWebhookEndpoint(id, { clearSecret: true });
    set((s) => ({
      endpoints: s.endpoints.map((e) => (e.id === id ? endpoint : e)),
    }));
  },

  deleteEndpoint: async (id) => {
    await deleteWebhookEndpoint(id);
    set((s) => ({
      endpoints: s.endpoints.filter((e) => e.id !== id),
      selectedWebhookId: s.selectedWebhookId === id ? null : s.selectedWebhookId,
      receipts: s.selectedWebhookId === id ? [] : s.receipts,
      selectedReceipt: s.selectedReceipt?.webhookId === id ? null : s.selectedReceipt,
    }));
  },

  clearReceipts: async (webhookId) => {
    await clearWebhookReceipts(webhookId);
    set({ receipts: [], selectedReceipt: null });
  },
}));
