import type { Metadata } from "next";
import LegalPage, { Contact } from "@/components/LegalPage";
import { SOURCE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy · Daily Brief" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Daily Brief is an independent, open-source app (
        <a href={SOURCE_URL} className="underline">source code</a>) that turns
        your recent Gmail inbox into a prioritised summary. This page explains
        exactly what data it touches and what happens to it.
      </p>

      <h2>What we access</h2>
      <p>When you sign in with Google, you grant Daily Brief:</p>
      <ul>
        <li>
          <strong>Your email address</strong>, to show which account is signed
          in and to address drafted replies from you.
        </li>
        <li>
          <strong>Read-only access to Gmail</strong> (
          <code>gmail.readonly</code>). Daily Brief cannot send, delete, label
          or change any email.
        </li>
      </ul>
      <p>
        Using that access, the app reads up to 30 of your most recent inbox
        emails from the last 7 days, excluding the Promotions and Social tabs:
        sender, subject, date, Gmail labels (such as Important or Starred) and
        message text. When you ask for a draft reply, it reads the messages in
        that one conversation.
      </p>

      <h2>How we use it</h2>
      <p>Only to provide the features you see, while you use them:</p>
      <ul>
        <li>
          Email content is sent to Google&apos;s <strong>Gemini API</strong>{" "}
          (free tier; see Sharing below) to prioritise and summarise your
          emails, extract deadlines, and draft replies. If Gemini is
          unavailable, a rule-based engine on our server does the same job
          without AI.
        </li>
        <li>
          The finished brief is sent back to your browser and kept only in
          that tab&apos;s memory. Closing or refreshing the tab discards it.
        </li>
      </ul>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>No email content is stored</strong>: there is no database.
          Emails are processed in memory for the request and then discarded.
        </li>
        <li>
          Your Google access token is kept in an encrypted, HTTP-only cookie
          in your browser and expires after about an hour. We do not request
          a refresh token, so we never hold long-term access to your account.
        </li>
        <li>
          Our hosting provider keeps standard server logs (such as time, IP
          address and error messages). We don&apos;t write email content to
          these logs.
        </li>
      </ul>

      <h2>Sharing, and what Google may do with your email text</h2>
      <p>
        We don&apos;t sell your data, show you ads, or share it with anyone,
        except Google&apos;s Gemini API, which processes email content to
        produce your brief and draft replies.
      </p>
      <p>
        <strong>Important:</strong> Daily Brief is a free project and uses the{" "}
        <strong>free tier</strong> of the Gemini API. Under{" "}
        <a href="https://ai.google.dev/gemini-api/terms" className="underline">
          Google&apos;s Gemini API terms
        </a>
        , Google uses content sent to its free tier to provide, improve and
        develop its products and machine-learning technologies, and human
        reviewers at Google may read it. If you don&apos;t want Google to
        process your emails this way, please don&apos;t use Daily Brief.
      </p>
      <p>
        We (the developer) don&apos;t read your email, don&apos;t keep it,
        and don&apos;t use it to train any models ourselves.
      </p>
      <p>
        Daily Brief hasn&apos;t been through Google&apos;s paid verification
        and security review, which is why Google shows an &ldquo;unverified
        app&rdquo; warning when you sign in.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Sign out</strong> in the app: this deletes the session
          cookie and revokes Daily Brief&apos;s access at Google immediately.
        </li>
        <li>
          You can also remove access at any time from your{" "}
          <a href="https://myaccount.google.com/permissions" className="underline">
            Google Account permissions
          </a>{" "}
          page.
        </li>
        <li>
          Because we store nothing, there is no saved data to delete. Ask us at
          the contact below if you have questions.
        </li>
      </ul>

      <h2>Children</h2>
      <p>Daily Brief is not intended for children under 13.</p>

      <h2>Changes</h2>
      <p>
        If this policy changes, we&apos;ll update this page and the date at
        the top.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests: <Contact />.
      </p>
    </LegalPage>
  );
}
