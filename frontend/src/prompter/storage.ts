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
  /** Extra horizontal inset per side (vw) to narrow the scrolling column. */
  sidePadding: number;
  /** Clearance below text as % of viewport height (scroll tail for overhead camera). */
  bottomPadding: number;
  /** Enable speech-sync teleprompter (mic + word tracking). */
  adaptiveEnabled: boolean;
  /** Start mic sync automatically when Play is pressed. */
  adaptiveAutoSync: boolean;
  theme: Theme;
  mirror: boolean;
};

/** Single user-facing auto-sync flag (both storage fields must match). */
export function isAutoSyncOnPlay(settings: PrompterSettings): boolean {
  return settings.adaptiveEnabled && settings.adaptiveAutoSync;
}

/** Normalize legacy/partial saves to the paired toggle model. */
export function normalizeAdaptiveFlags(
  parsed: Partial<PrompterSettings>,
): Pick<PrompterSettings, "adaptiveEnabled" | "adaptiveAutoSync"> {
  const on = Boolean(parsed.adaptiveAutoSync) || Boolean(parsed.adaptiveEnabled);
  return { adaptiveEnabled: on, adaptiveAutoSync: on };
}

export const SIDE_PADDING_MIN = 0;
export const SIDE_PADDING_MAX = 30;

export const BOTTOM_PADDING_MIN = 0;
export const BOTTOM_PADDING_MAX = 100;

export const DEFAULT_SETTINGS: PrompterSettings = {
  speed: 1,
  fontSize: 24,
  sidePadding: 0,
  bottomPadding: 0,
  adaptiveEnabled: false,
  adaptiveAutoSync: false,
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
    const adaptive = normalizeAdaptiveFlags(parsed);
    return {
      speed: typeof parsed.speed === "number" ? parsed.speed : DEFAULT_SETTINGS.speed,
      fontSize:
        typeof parsed.fontSize === "number" ? parsed.fontSize : DEFAULT_SETTINGS.fontSize,
      sidePadding:
        typeof parsed.sidePadding === "number"
          ? Math.min(SIDE_PADDING_MAX, Math.max(SIDE_PADDING_MIN, parsed.sidePadding))
          : DEFAULT_SETTINGS.sidePadding,
      bottomPadding:
        typeof parsed.bottomPadding === "number"
          ? Math.min(BOTTOM_PADDING_MAX, Math.max(BOTTOM_PADDING_MIN, parsed.bottomPadding))
          : DEFAULT_SETTINGS.bottomPadding,
      adaptiveEnabled: adaptive.adaptiveEnabled,
      adaptiveAutoSync: adaptive.adaptiveAutoSync,
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
