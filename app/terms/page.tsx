import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { Contact } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service · Daily Brief" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        By using Daily Brief you agree to these terms. If you don&apos;t
        agree, please don&apos;t use the app.
      </p>

      <h2>The service</h2>
      <p>
        Daily Brief reads your recent Gmail inbox (read-only) and produces a
        prioritised summary, extracted deadlines and draft replies. How your
        data is handled is described in the{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>

      <h2>AI output can be wrong</h2>
      <p>
        Priorities, summaries, deadlines and drafts are generated
        automatically and may be inaccurate or incomplete. Always check the
        original email before acting on it. Daily Brief never sends email for
        you: you review, edit and send any reply yourself in Gmail, and you
        are responsible for what you send.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use Daily Brief only with a Google account you are allowed to use.
        Don&apos;t try to disrupt the service, get around its limits, or
        access other people&apos;s data.
      </p>

      <h2>No warranty</h2>
      <p>
        Daily Brief is provided free, &ldquo;as is&rdquo;, without warranties
        of any kind. To the extent the law allows, we are not liable for any
        loss arising from your use of it, including missed emails or
        deadlines.
      </p>

      <h2>Changes and availability</h2>
      <p>
        We may change, limit or stop the service, or update these terms, at
        any time. Continuing to use the app after a change means you accept
        the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        <Contact />
      </p>
    </LegalPage>
  );
}
