import { NextRequest, NextResponse } from "next/server";
import {
  GMAIL_SCOPE,
  OAUTH_COOKIE,
  SESSION_COOKIE,
  cookieOptions,
  emailFromIdToken,
  redirectUri,
  revokeToken,
  seal,
  unseal,
  type PendingLogin,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl;

  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/?error=${reason}`, url.origin));
    response.cookies.delete(OAUTH_COOKIE);
    return response;
  };

  if (url.searchParams.get("error")) return fail("denied");

  const pending = unseal<PendingLogin>(request.cookies.get(OAUTH_COOKIE)?.value);
  const code = url.searchParams.get("code");
  if (!pending || !code || url.searchParams.get("state") !== pending.state) {
    return fail("state");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
      code_verifier: pending.verifier,
    }),
  });
  if (!tokenRes.ok) {
    console.warn("[auth] token exchange failed:", tokenRes.status, await tokenRes.text());
    return fail("token");
  }

  const token = (await tokenRes.json()) as TokenResponse;
  if (!token.access_token) return fail("token");

  // Google lets people untick individual permissions on the consent screen.
  // Without Gmail read access the app can't do anything, so say so clearly.
  if (!token.scope?.split(" ").includes(GMAIL_SCOPE)) {
    await revokeToken(token.access_token);
    return fail("scope");
  }

  const expiresIn = token.expires_in ?? 3600;
  const response = NextResponse.redirect(new URL("/", url.origin));
  response.cookies.delete(OAUTH_COOKIE);
  response.cookies.set(
    SESSION_COOKIE,
    seal({
      accessToken: token.access_token,
      email: emailFromIdToken(token.id_token),
      expiresAt: Date.now() + expiresIn * 1000,
    }),
    { ...cookieOptions, maxAge: expiresIn }
  );
  return response;
}
