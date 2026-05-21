/**
 * Origin used in QR / relay links so other devices on LAN or hotspot can reach this host.
 * Configure via `.env`: `PUBLIC_HOST` + `FRONTEND_HOST_PORT`, or `PUBLIC_ORIGIN` override.
 */
export function resolveHandoffOrigin(fallbackOrigin: string): string {
  const explicit = import.meta.env.VITE_PUBLIC_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const host = import.meta.env.VITE_PUBLIC_HOST?.trim();
  if (host) {
    const protocol = import.meta.env.VITE_PUBLIC_PROTOCOL?.trim() || "http";
    const port = import.meta.env.VITE_PUBLIC_PORT?.trim();
    if (port && port !== "80" && port !== "443") {
      return `${protocol}://${host}:${port}`;
    }
    return `${protocol}://${host}`;
  }

  return fallbackOrigin.replace(/\/$/, "");
}
