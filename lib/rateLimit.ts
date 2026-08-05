// Simple in-memory fixed-window rate limiter, keyed by client IP.
// Good enough for a demo: resets on cold start, not shared across
// concurrent serverless instances — but stops naive abuse/quota burn
// without needing a database or external service.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 5;

// `key` must be namespaced per endpoint (e.g. "draft-reply:1.2.3.4") —
// a bare IP would let usage on one endpoint eat another endpoint's quota.
export function checkRateLimit(
  key: string,
  options: { windowMs?: number; maxRequests?: number } = {}
): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
