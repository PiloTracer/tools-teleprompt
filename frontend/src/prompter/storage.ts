import type { ScriptFormat } from "../markdown/types";

export const STORAGE_KEYS = {
  source: "tp:script:source",
  format: "tp:script:format",
  settings: "tp:settings",
} as const;

export type Theme = "light" | "dark";

export type PrompterSettings = {
  speed: number;
  fontSize: number;
  theme: Theme;
  mirror: boolean;
};

export const DEFAULT_SETTINGS: PrompterSettings = {
  speed: 1,
  fontSize: 24,
  theme: "light",
  mirror: false,
};

const IDB_NAME = "tools-teleprompt";
const IDB_STORE = "kv";
const IDB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(key);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB get failed"));
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.put(value, key);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB put failed"));
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

function hasLocalStorage(): boolean {
  try {
    const probe = "__tp_storage_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

function readLocal(key: string): string | null {
  if (!hasLocalStorage()) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string): boolean {
  if (!hasLocalStorage()) {
    return false;
  }
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function loadScriptSource(): Promise<string> {
  if (hasLocalStorage()) {
    return readLocal(STORAGE_KEYS.source) ?? "";
  }
  return (await idbGet(STORAGE_KEYS.source)) ?? "";
}

export async function saveScriptSource(source: string): Promise<void> {
  if (writeLocal(STORAGE_KEYS.source, source)) {
    return;
  }
  await idbSet(STORAGE_KEYS.source, source);
}

export async function loadScriptFormat(): Promise<ScriptFormat> {
  if (hasLocalStorage()) {
    const raw = readLocal(STORAGE_KEYS.format) ?? "plain";
    return raw === "markdown" ? "markdown" : "plain";
  }
  const raw = (await idbGet(STORAGE_KEYS.format)) ?? "plain";
  return raw === "markdown" ? "markdown" : "plain";
}

export async function saveScriptFormat(format: ScriptFormat): Promise<void> {
  if (writeLocal(STORAGE_KEYS.format, format)) {
    return;
  }
  await idbSet(STORAGE_KEYS.format, format);
}

export async function loadSettings(): Promise<PrompterSettings> {
  const raw = hasLocalStorage()
    ? readLocal(STORAGE_KEYS.settings)
    : await idbGet(STORAGE_KEYS.settings);
  if (!raw) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PrompterSettings>;
    return {
      speed: typeof parsed.speed === "number" ? parsed.speed : DEFAULT_SETTINGS.speed,
      fontSize:
        typeof parsed.fontSize === "number" ? parsed.fontSize : DEFAULT_SETTINGS.fontSize,
      theme: parsed.theme === "dark" ? "dark" : "light",
      mirror: Boolean(parsed.mirror),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: PrompterSettings): Promise<void> {
  const payload = JSON.stringify(settings);
  if (writeLocal(STORAGE_KEYS.settings, payload)) {
    return;
  }
  await idbSet(STORAGE_KEYS.settings, payload);
}

/** Test helper — clear persisted script + settings. */
export async function clearPrompterStorage(): Promise<void> {
  if (hasLocalStorage()) {
    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
    return;
  }
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      await idbSet(key, "");
    } catch {
      /* ignore */
    }
  }
}
