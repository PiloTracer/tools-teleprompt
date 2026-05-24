/** Enable with `localStorage.setItem('tp:debug', '1')` or disable with `'0'`. */
export function isSyncDebugEnabled(): boolean {
  try {
    const flag = localStorage.getItem("tp:debug");
    if (flag === "0") {
      return false;
    }
    if (flag === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  // Keep test output deterministic and quiet unless explicitly opted in.
  if (import.meta.env.MODE === "test") {
    return false;
  }
  return import.meta.env.DEV;
}

const PREFIX = "[tp-sync]";

export function syncLog(event: string, data?: Record<string, unknown>): void {
  if (!isSyncDebugEnabled()) {
    return;
  }
  if (data === undefined) {
    console.log(PREFIX, event);
    return;
  }
  console.log(PREFIX, event, data);
}

export function syncWarn(event: string, data?: Record<string, unknown>): void {
  if (!isSyncDebugEnabled()) {
    return;
  }
  if (data === undefined) {
    console.warn(PREFIX, event);
    return;
  }
  console.warn(PREFIX, event, data);
}

const lastThrottleAt = new Map<string, number>();

/** Log at most once per `intervalMs` for each key. */
export function syncLogThrottled(
  key: string,
  intervalMs: number,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!isSyncDebugEnabled()) {
    return;
  }
  const now = performance.now();
  const last = lastThrottleAt.get(key);
  if (last !== undefined && now - last < intervalMs) {
    return;
  }
  lastThrottleAt.set(key, now);
  syncLog(event, data);
}

const lastValues = new Map<string, unknown>();

/** Log only when `value` changes (shallow compare via JSON for objects). */
export function syncLogOnChange(
  key: string,
  value: unknown,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!isSyncDebugEnabled()) {
    return;
  }
  const serialized = typeof value === "object" && value !== null ? JSON.stringify(value) : value;
  if (lastValues.get(key) === serialized) {
    return;
  }
  lastValues.set(key, serialized);
  syncLog(event, { ...data, value });
}

/** One-time banner so operators know how to toggle logs. */
let bootLogged = false;

export function syncLogBootOnce(): void {
  if (bootLogged || !isSyncDebugEnabled()) {
    return;
  }
  bootLogged = true;
  syncLog("debug enabled", {
    hint: "localStorage.setItem('tp:debug','0') to silence · '1' to force on in production",
  });
}
