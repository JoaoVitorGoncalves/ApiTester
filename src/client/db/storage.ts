import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Collection, HistoryEntry } from '@core/types';

interface ApiFlashDB extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { 'by-at': number };
  };
  collections: {
    key: string;
    value: Collection;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'apiflash';
const DB_VERSION = 1;
const HISTORY_LIMIT = 100;

let dbPromise: Promise<IDBPDatabase<ApiFlashDB>> | null = null;

function db(): Promise<IDBPDatabase<ApiFlashDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ApiFlashDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const history = database.createObjectStore('history', { keyPath: 'id' });
        history.createIndex('by-at', 'at');
        const collections = database.createObjectStore('collections', { keyPath: 'id' });
        collections.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const all = await (await db()).getAllFromIndex('history', 'by-at');
  return all.reverse();
}

export async function pushHistory(entry: HistoryEntry): Promise<void> {
  const database = await db();
  await database.put('history', entry);
  const keys = await database.getAllKeysFromIndex('history', 'by-at');
  if (keys.length > HISTORY_LIMIT) {
    const excess = keys.slice(0, keys.length - HISTORY_LIMIT);
    const tx = database.transaction('history', 'readwrite');
    await Promise.all(excess.map((k) => tx.store.delete(k)));
    await tx.done;
  }
}

export async function clearHistory(): Promise<void> {
  await (await db()).clear('history');
}

export async function loadCollections(): Promise<Collection[]> {
  const all = await (await db()).getAllFromIndex('collections', 'by-createdAt');
  return all;
}

export async function saveCollection(collection: Collection): Promise<void> {
  await (await db()).put('collections', collection);
}

export async function deleteCollection(id: string): Promise<void> {
  await (await db()).delete('collections', id);
}
