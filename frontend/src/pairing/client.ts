import type { ScriptFormat } from "../markdown/types";
import { resolveHandoffOrigin } from "./publicOrigin";

export type CreateSessionResponse = {
  token: string;
  otp: string;
  claim_url: string;
  expires_at: string;
};

export type CreateLanHandoffResponse = {
  token: string;
  claim_url: string;
  expires_at: string;
};

export type ClaimSessionResponse = {
  text: string;
  format: ScriptFormat;
};

export type LanHandoffPayload = ClaimSessionResponse;

export class PairingApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PairingApiError";
    this.status = status;
  }
}

function apiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (typeof base === "string" && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  return "";
}

async function readProblemDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; title?: string };
    return body.detail ?? body.title ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function createRelaySession(
  text: string,
  format: ScriptFormat,
): Promise<CreateSessionResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, format }),
  });
  if (!response.ok) {
    throw new PairingApiError(await readProblemDetail(response), response.status);
  }
  return (await response.json()) as CreateSessionResponse;
}

export async function claimRelaySession(
  token: string,
  otp: string,
): Promise<ClaimSessionResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/sessions/${encodeURIComponent(token)}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp }),
  });
  if (!response.ok) {
    throw new PairingApiError(await readProblemDetail(response), response.status);
  }
  return (await response.json()) as ClaimSessionResponse;
}

/** SPA URL for phone to open (frontend route, not raw API GET). */
export function lanHandoffPageUrl(token: string, origin?: string): string {
  const resolved =
    origin ??
    resolveHandoffOrigin(
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    );
  return `${resolved}/handoff/lan/${encodeURIComponent(token)}`;
}

export async function createLanHandoff(
  text: string,
  format: ScriptFormat,
): Promise<CreateLanHandoffResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/v1/handoff/lan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, format }),
  });
  if (!response.ok) {
    throw new PairingApiError(await readProblemDetail(response), response.status);
  }
  return (await response.json()) as CreateLanHandoffResponse;
}

export async function claimLanHandoff(token: string): Promise<LanHandoffPayload> {
  const response = await fetch(
    `${apiBaseUrl()}/api/v1/handoff/lan/${encodeURIComponent(token)}`,
  );
  if (!response.ok) {
    throw new PairingApiError(await readProblemDetail(response), response.status);
  }
  return (await response.json()) as LanHandoffPayload;
}
