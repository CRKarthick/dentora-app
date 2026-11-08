"use client";

/**
 * Local database abstraction.
 *
 * - Electron persists normalized records in SQLite through a narrow preload
 *   bridge. The renderer never receives filesystem or SQL access.
 * - When running in a regular browser (e.g. `next dev`), the same API falls
 *   back to localStorage so web development requires no separate server.
 */

type DbShape = Record<string, unknown>;

declare global {
  interface Window {
    dentoraDb?: {
      collectionExists: (name: string) => Promise<boolean>;
      readCollection: <T>(name: string) => Promise<T[]>;
      replaceCollection: <T>(name: string, records: T[]) => Promise<boolean>;
      upsertRecord: <T extends { id: string }>(
        name: string,
        id: string,
        record: T,
      ) => Promise<boolean>;
      deleteRecord: (name: string, id: string) => Promise<boolean>;
      readDocument: <T extends object>(key: string) => Promise<T | null>;
      writeDocument: <T extends object>(
        key: string,
        value: T,
      ) => Promise<boolean>;
    };
  }
}

const BROWSER_STORAGE_KEY = "dentora.local-db.v1";

function isElectron(): boolean {
  return typeof window !== "undefined" && typeof window.dentoraDb !== "undefined";
}

function readBrowserDb(): DbShape {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(BROWSER_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as DbShape) : {};
  } catch {
    return {};
  }
}

function writeBrowserDb(data: DbShape) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(data));
}

/** Read a single collection (array) from the local database. */
export async function readCollection<T>(collection: string): Promise<T[]> {
  if (isElectron()) {
    return window.dentoraDb!.readCollection<T>(collection);
  }
  const db = readBrowserDb();
  const value = db[collection];
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Check whether a collection has been initialized, including an empty one. */
export async function hasCollection(collection: string): Promise<boolean> {
  if (isElectron()) {
    return window.dentoraDb!.collectionExists(collection);
  }
  const db = readBrowserDb();
  return Array.isArray(db[collection]);
}

/** Persist a single collection (array) into the local database. */
export async function writeCollection<T>(collection: string, records: T[]): Promise<void> {
  if (isElectron()) {
    await window.dentoraDb!.replaceCollection(collection, records);
    return;
  }
  const db = readBrowserDb();
  db[collection] = records;
  writeBrowserDb(db);
}

/** Insert or replace one record without rewriting its whole SQLite table. */
export async function upsertCollectionRecord<T extends { id: string }>(
  collection: string,
  record: T,
): Promise<void> {
  if (isElectron()) {
    await window.dentoraDb!.upsertRecord(collection, record.id, record);
    return;
  }
  const records = await readCollection<T>(collection);
  const index = records.findIndex((item) => item.id === record.id);
  const updated = [...records];
  if (index === -1) {
    updated.push(record);
  } else {
    updated[index] = record;
  }
  await writeCollection(collection, updated);
}

/** Delete one record without rewriting its whole SQLite table. */
export async function deleteCollectionRecord(
  collection: string,
  id: string,
): Promise<void> {
  if (isElectron()) {
    await window.dentoraDb!.deleteRecord(collection, id);
    return;
  }
  const records = await readCollection<{ id: string }>(collection);
  await writeCollection(
    collection,
    records.filter((record) => record.id !== id),
  );
}

/** Read a single document (object) from the local database. */
export async function readDocument<T extends object>(key: string): Promise<T | null> {
  if (isElectron()) {
    return window.dentoraDb!.readDocument<T>(key);
  }
  const db = readBrowserDb();
  const value = db[key];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as T;
  }
  return null;
}

/** Persist a single document (object) into the local database. */
export async function writeDocument<T extends object>(key: string, value: T): Promise<void> {
  if (isElectron()) {
    await window.dentoraDb!.writeDocument(key, value);
    return;
  }
  const db = readBrowserDb();
  db[key] = value;
  writeBrowserDb(db);
}
