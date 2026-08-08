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
  description: "Visualize replays de StarCraft II em um mapa tático 2D.",
  openGraph: {
    title: "SC2 Replay Watcher",
    description: "Veja a partida. Entenda o movimento.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SC2 Replay Watcher — mapa tático 2D" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SC2 Replay Watcher",
    description: "Veja a partida. Entenda o movimento.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}><I18nProvider><ReplayProvider>{children}</ReplayProvider></I18nProvider></body></html>;
}
