import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReplayProvider } from "@/components/replay-context";
import { I18nProvider } from "@/components/i18n";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "SC2 Replay Watcher",
  description: "Explore StarCraft II replays on an interactive 2D tactical map.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "SC2 Replay Watcher",
    description: "Watch the match. Understand the movement.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SC2 Replay Watcher — 2D tactical map" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SC2 Replay Watcher",
    description: "Watch the match. Understand the movement.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}><I18nProvider><ReplayProvider>{children}</ReplayProvider></I18nProvider></body></html>;
}
