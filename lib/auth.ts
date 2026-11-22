// Google sign-in + session handling, with no database.
//
// The only thing we keep is the short-lived Google access token (about 1 hour),
// stored in an encrypted, HTTP-only cookie. We ask for `access_type=online`,
// so Google never gives us a refresh token: when the hour is up the user just
// signs in again. Nothing about the user is stored on the server.

import crypto from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const SCOPES = ["openid", "email", GMAIL_SCOPE];

export const SESSION_COOKIE = "db_session";
export const OAUTH_COOKIE = "db_oauth";

export type Session = { accessToken: string; email: string; expiresAt: number };
export type PendingLogin = { state: string; verifier: string };

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function missingAuthConfig(): string[] {
  return ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SECRET"].filter(
    (name) => !process.env[name]
  );
}

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

// AES-256-GCM: the cookie can be neither read nor tampered with by the browser.
export function seal(data: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function unseal<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    const [iv, tag, ciphertext] = value
      .split(".")
      .map((part) => Buffer.from(part, "base64url"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function redirectUri(request: NextRequest): string {
  return `${request.nextUrl.origin}/api/auth/callback`;
}

// Works in Server Components and Route Handlers.
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const session = unseal<Session>(store.get(SESSION_COOKIE)?.value);
  // Treat tokens that expire within a minute as already expired.
  if (!session || session.expiresAt < Date.now() + 60_000) return null;
  return session;
}

// The ID token comes straight from Google's token endpoint over TLS, so per
// the OpenID Connect spec its signature doesn't need re-verifying here.
export function emailFromIdToken(idToken: string | undefined): string {
  if (!idToken) return "";
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")
    ) as { email?: unknown };
    return typeof payload.email === "string" ? payload.email : "";
  } catch {
    return "";
  }
}

export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch (err) {
    console.warn(
      "[auth] token revoke failed:",
      err instanceof Error ? err.message : err
    );
  }
}
