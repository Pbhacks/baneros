import { openDB } from "idb";
import { DesktopState } from "@/utils/types";

const DB_NAME = "webos-hybrid";
const STORE_NAME = "kv";
const DESKTOP_STATE_KEY = "desktop-state";
const DB_TIMEOUT_MS = 2500;

const withTimeout = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), DB_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

const getDb = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return await withTimeout(
      openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      }),
      null,
    );
  } catch {
    return null;
  }
};

export const loadDesktopState = async (): Promise<DesktopState | null> => {
  const db = await getDb();
  if (!db) {
    return null;
  }

  try {
    const state = await withTimeout(db.get(STORE_NAME, DESKTOP_STATE_KEY), null);
    return (state as DesktopState | undefined) ?? null;
  } catch {
    return null;
  }
};

export const saveDesktopState = async (state: DesktopState): Promise<void> => {
  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    await withTimeout(db.put(STORE_NAME, state, DESKTOP_STATE_KEY), undefined);
  } catch {
    // Ignore storage failures so the app can keep running.
  }
};
