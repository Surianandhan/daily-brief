import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, POLICY_LAST_UPDATED, SOURCE_URL } from "@/lib/site";

export function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <a href={`${SOURCE_URL}/issues`} className="underline">
      the project&apos;s GitHub issues page
    </a>
  );
}

export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16 text-zinc-700 dark:text-zinc-300 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
      <Link href="/" className="text-sm text-zinc-500 underline">
        ← Daily Brief
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        <p className="text-sm text-zinc-500">Last updated: {POLICY_LAST_UPDATED}</p>
      </header>
      {children}
    </div>
  );
}
