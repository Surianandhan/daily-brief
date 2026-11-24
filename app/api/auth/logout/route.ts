import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, revokeToken, unseal, type Session } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Signing out also revokes the app's Gmail access at Google, so nothing
// issued to this app keeps working afterwards.
export async function POST(request: NextRequest) {
  const session = unseal<Session>(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.accessToken) await revokeToken(session.accessToken);

  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
