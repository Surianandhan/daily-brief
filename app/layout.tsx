import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BriefProvider } from "@/lib/BriefContext";
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
  description: "AI email triage",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BriefProvider>{children}</BriefProvider>
      </body>
    </html>
  );
}
