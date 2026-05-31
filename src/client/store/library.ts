import { create } from 'zustand';
import {
  uid,
  type Collection,
  type HistoryEntry,
  type RequestSpec,
  type ResponseResult,
  type SavedRequest,
} from '@core/types';
import {
  clearHistory,
  deleteCollection as dbDeleteCollection,
  loadCollections,
  loadHistory,
  pushHistory,
  saveCollection,
} from '../db/storage';

interface LibraryState {
  history: HistoryEntry[];
  collections: Collection[];
  loaded: boolean;

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

  init: async () => {
    if (get().loaded) return;
    const [history, collections] = await Promise.all([loadHistory(), loadCollections()]);
    set({ history, collections, loaded: true });
  },

  clearAllHistory: async () => {
    await clearHistory();
    set({ history: [] });
  },

  createCollection: async (name) => {
    const collection: Collection = {
      id: uid('col'),
      name: name.trim() || 'Collection',
      requests: [],
      createdAt: Date.now(),
    };
    await saveCollection(collection);
    set((s) => ({ collections: [...s.collections, collection] }));
    return collection;
  },

  renameCollection: async (id, name) => {
    const collection = get().collections.find((c) => c.id === id);
    if (!collection) return;
    const updated: Collection = { ...collection, name: name.trim() || collection.name };
    await saveCollection(updated);
    set((s) => ({ collections: s.collections.map((c) => (c.id === id ? updated : c)) }));
  },

  deleteCollection: async (id) => {
    await dbDeleteCollection(id);
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
  },

  saveRequest: async (collectionId, name, spec) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;
    const now = Date.now();
    const saved: SavedRequest = {
      id: uid('req'),
      name: name.trim() || 'Untitled request',
      spec: structuredClone(spec),
      createdAt: now,
      updatedAt: now,
    };
    const updated: Collection = { ...collection, requests: [...collection.requests, saved] };
    await saveCollection(updated);
    set((s) => ({ collections: s.collections.map((c) => (c.id === collectionId ? updated : c)) }));
  },

  removeSavedRequest: async (collectionId, requestId) => {
    const collection = get().collections.find((c) => c.id === collectionId);
    if (!collection) return;
    const updated: Collection = {
      ...collection,
      requests: collection.requests.filter((r) => r.id !== requestId),
    };
    await saveCollection(updated);
    set((s) => ({ collections: s.collections.map((c) => (c.id === collectionId ? updated : c)) }));
  },
}));

/** Append a completed request to local history (called from the request store). */
export async function recordHistory(spec: RequestSpec, result: ResponseResult): Promise<void> {
  const entry: HistoryEntry = {
    id: uid('hist'),
    method: spec.method,
    url: spec.url,
    status: result.status,
    durationMs: result.durationMs,
    at: Date.now(),
    spec: structuredClone(spec),
  };
  await pushHistory(entry);
  useLibrary.setState((s) => ({ history: [entry, ...s.history].slice(0, 100) }));
}
