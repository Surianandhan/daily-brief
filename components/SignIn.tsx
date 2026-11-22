import Link from "next/link";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function SignIn({ error }: { error?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Brief</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Turn your Gmail inbox into a short, prioritised brief. Daily Brief
          groups your recent emails into conversations, scores each one
          (Urgent / This week / FYI), pulls out deadlines and to-dos, and
          drafts replies you can edit.
        </p>
      </header>

      <ul className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <li>• <strong>Read-only:</strong> it can&apos;t send, delete or change any email.</li>
        <li>• Only reads inbox emails from the last 7 days (skips Promotions and Social).</li>
        <li>• Nothing is stored on our servers. Your brief lives in your browser tab.</li>
        <li>• Signing out removes the app&apos;s access to your Gmail.</li>
      </ul>

      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Please read:</strong> to write your brief, the text of your
        recent emails is sent to Google&apos;s Gemini AI on its <strong>free
        tier</strong>. On the free tier, Google may use that text to improve
        its products and AI, and people at Google may read it. Don&apos;t sign
        in with an inbox containing anything you wouldn&apos;t want Google to
        see. Google will also show an &ldquo;unverified app&rdquo; warning,
        because this free project hasn&apos;t been through Google&apos;s paid
        review.
      </p>

      <div className="flex flex-col items-start gap-3">
        <a
          href="/api/auth/login"
          className="flex items-center gap-3 rounded-full border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50"
        >
          <GoogleLogo />
          Sign in with Google
        </a>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-zinc-500">
          By signing in you agree to the{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
