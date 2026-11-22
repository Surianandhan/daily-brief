import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_COOKIE,
  SCOPES,
  cookieOptions,
  missingAuthConfig,
  pkceChallenge,
  randomToken,
  redirectUri,
  seal,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const missing = missingAuthConfig();
  if (missing.length > 0) {
    return new NextResponse(
      `Sign-in isn't configured yet. Missing environment variables: ${missing.join(", ")}`,
      { status: 500 }
    );
  }

  const state = randomToken();
  const verifier = randomToken();
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    // "online" = no refresh token. We never keep long-lived access.
    access_type: "online",
    prompt: "select_account",
  });

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
  response.cookies.set(OAUTH_COOKIE, seal({ state, verifier }), {
    ...cookieOptions,
    maxAge: 600,
  });
  return response;
}
