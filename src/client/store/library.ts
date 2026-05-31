import { create } from 'zustand';
import { toHistoryEntry } from '@core/history';
import type { Collection, HistoryEntry, RequestSpec, ResponseResult, SavedRequest } from '@core/types';
import { uid } from '@core/types';
import {
  addSavedRequestApi,
  ApiError,
  checkDbHealth,
  clearHistoryApi,
  createCollectionApi,
  deleteCollectionApi,
  fetchCollections,
  fetchHistory,
  postHistory,
  removeSavedRequestApi,
  renameCollectionApi,
} from '../api/library';
import { useAuth } from './auth';
import { usePrefs } from './prefs';

interface LibraryState {
  history: HistoryEntry[];
  collections: Collection[];
  loaded: boolean;
  dbStatus: 'ok' | 'down' | 'not_configured' | 'unknown';
  lastError: string | null;

  reset: () => void;
  init: () => Promise<void>;
  clearAllHistory: () => Promise<void>;
  createCollection: (name: string) => Promise<Collection>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  saveRequest: (collectionId: string, name: string, spec: RequestSpec) => Promise<void>;
  removeSavedRequest: (collectionId: string, requestId: string) => Promise<void>;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  history: [],
  collections: [],
  loaded: false,
  dbStatus: 'unknown',
  lastError: null,

  reset: () =>
    set({
      history: [],
      collections: [],
      loaded: false,
      dbStatus: 'unknown',
      lastError: null,
    }),

  init: async () => {
    const authMode = useAuth.getState().mode;
    if (authMode !== 'guest' && authMode !== 'user') return;
    if (get().loaded) return;
    const dbStatus = await checkDbHealth();
    if (dbStatus !== 'ok') {
      set({ loaded: true, dbStatus, lastError: dbStatus === 'down' ? 'database_unavailable' : null });
      return;
    }
    try {
      const [history, collections] = await Promise.all([fetchHistory(), fetchCollections()]);
      set({ history, collections, loaded: true, dbStatus: 'ok', lastError: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load library.';
      set({ loaded: true, dbStatus: 'down', lastError: message });
    }
  },

  clearAllHistory: async () => {
    await clearHistoryApi();
    set({ history: [] });
  },

  createCollection: async (name) => {
    const collection = await createCollectionApi(uid('col'), name.trim() || 'Collection', Date.now());
    set((s) => ({ collections: [...s.collections, collection] }));
    return collection;
  },

  renameCollection: async (id, name) => {
    await renameCollectionApi(id, name.trim());
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, name: name.trim() || c.name } : c,
      ),
    }));
  },

  deleteCollection: async (id) => {
    await deleteCollectionApi(id);
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
  },

  saveRequest: async (collectionId, name, spec) => {
    const now = Date.now();
    const saved: SavedRequest = {
      id: uid('req'),
      name: name.trim() || 'Untitled request',
      spec: structuredClone(spec),
      createdAt: now,
      updatedAt: now,
    };
    await addSavedRequestApi(collectionId, saved);
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId ? { ...c, requests: [...c.requests, saved] } : c,
      ),
    }));
  },

  removeSavedRequest: async (collectionId, requestId) => {
    await removeSavedRequestApi(collectionId, requestId);
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === collectionId
          ? { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
          : c,
      ),
    }));
  },
}));

/** Append a completed request to history when saving is enabled. */
export async function recordHistory(spec: RequestSpec, result: ResponseResult): Promise<void> {
  if (!usePrefs.getState().saveHistory) return;

  const lib = useLibrary.getState();
  if (lib.dbStatus !== 'ok') return;

  const entry = toHistoryEntry(spec, result);
  try {
    await postHistory(entry);
    useLibrary.setState((s) => ({ history: [entry, ...s.history].slice(0, 100) }));
  } catch {
    // History save is best-effort; do not block the send flow.
  }
}
