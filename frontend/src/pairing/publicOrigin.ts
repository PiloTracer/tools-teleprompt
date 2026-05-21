/**
 * Origin used in QR / LAN handoff links so other devices on LAN or hotspot can reach this host.
 * Sources (first match wins in async path): API `/handoff/public-config` → build-time env → LAN IP from page URL.
 */
type PublicHandoffConfig = {
  spa_public_origin: string;
};

let cachedRemoteOrigin: string | null | undefined;

function apiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === "string" && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  return "";
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function isLoopbackOrigin(origin: string): boolean {
  try {
    return isLoopbackHost(new URL(origin).hostname);
  } catch {
    return origin.includes("localhost") || origin.includes("127.0.0.1");
  }
}

function originFromParts(protocol: string, host: string, port?: string): string {
  const normalizedPort = port?.trim();
  if (normalizedPort && normalizedPort !== "80" && normalizedPort !== "443") {
    return `${protocol}://${host}:${normalizedPort}`;
  }
  return `${protocol}://${host}`;
}

function configuredFrontendPort(): string | undefined {
  return (
    import.meta.env.VITE_PUBLIC_PORT?.trim() ||
    import.meta.env.VITE_DEV_HMR_PORT?.trim() ||
    undefined
  );
}

function originFromBuildEnv(): string | null {
  const explicit = import.meta.env.VITE_PUBLIC_ORIGIN?.trim();
  if (explicit && !isLoopbackOrigin(explicit)) {
    return explicit.replace(/\/$/, "");
  }

  const host = import.meta.env.VITE_PUBLIC_HOST?.trim();
  if (host && !isLoopbackHost(host)) {
    return originFromParts(
      import.meta.env.VITE_PUBLIC_PROTOCOL?.trim() || "http",
      host,
      configuredFrontendPort(),
    );
  }

  const devHost = import.meta.env.VITE_DEV_HMR_HOST?.trim();
  if (devHost && !isLoopbackHost(devHost)) {
    return originFromParts("http", devHost, configuredFrontendPort() || "5173");
  }

  if (typeof window !== "undefined") {
    const { hostname, protocol, port } = window.location;
    if (!isLoopbackHost(hostname)) {
      const handoffPort = configuredFrontendPort() || port;
      return originFromParts(protocol.replace(":", ""), hostname, handoffPort || undefined);
    }
  }

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (host) {
    return originFromParts(
      import.meta.env.VITE_PUBLIC_PROTOCOL?.trim() || "http",
      host,
      configuredFrontendPort(),
    );
  }

  if (devHost) {
    return originFromParts("http", devHost, configuredFrontendPort() || "5173");
  }

  return null;
}

async function fetchRemoteOrigin(): Promise<string | null> {
  try {
    const base = apiBaseUrl();
    const url = base
      ? `${base}/api/v1/handoff/public-config`
      : "/api/v1/handoff/public-config";
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const body = (await response.json()) as PublicHandoffConfig;
    const origin = body.spa_public_origin?.trim();
    if (!origin || isLoopbackOrigin(origin)) {
      return null;
    }
    return origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** True when phones on the LAN cannot reach this origin (localhost / 127.0.0.1). */
export function isLoopbackHandoffOrigin(origin: string): boolean {
  return isLoopbackOrigin(origin);
}

/** Block QR/LAN when loopback would mislead a phone; allow same-host preview/E2E. */
export function blocksCrossDeviceHandoff(origin: string): boolean {
  if (!isLoopbackHandoffOrigin(origin)) {
    return false;
  }
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const resolved = new URL(origin);
    const current = window.location;
    return !(resolved.hostname === current.hostname && resolved.port === current.port);
  } catch {
    return true;
  }
}

/** Synchronous best-effort origin (build env + current page LAN IP). */
export function resolveHandoffOrigin(fallbackOrigin: string): string {
  return originFromBuildEnv() ?? fallbackOrigin.replace(/\/$/, "");
}

/** Preferred origin for QR/LAN links — reads server config when build env is loopback. */
export async function resolveHandoffOriginAsync(fallbackOrigin: string): Promise<string> {
  if (cachedRemoteOrigin === undefined) {
    cachedRemoteOrigin = await fetchRemoteOrigin();
  }
  if (cachedRemoteOrigin) {
    return cachedRemoteOrigin;
  }
  return resolveHandoffOrigin(fallbackOrigin);
}

/** Test helper — clears cached API config. */
export function resetHandoffOriginCache(): void {
  cachedRemoteOrigin = undefined;
}
