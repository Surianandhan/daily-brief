import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BriefProvider } from "@/lib/BriefContext";
import { SOURCE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Brief",
  description:
    "Turn your Gmail inbox into a prioritised daily brief: urgent threads, deadlines and draft replies.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BriefProvider>{children}</BriefProvider>
        <footer className="flex justify-center gap-4 px-6 py-6 text-xs text-zinc-500">
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <a href={SOURCE_URL} className="hover:underline">Source</a>
        </footer>
      </body>
    </html>
  );
}
