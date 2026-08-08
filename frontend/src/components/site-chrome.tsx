"use client";

import Link from "next/link";
import { Code2, Globe2, Info, Swords } from "lucide-react";

import { useI18n } from "@/components/i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="SC2 Replay Watcher — início">
        <span className="brand-mark"><Swords size={18} /></span>
        <span><strong>SC2</strong> Replay Watcher</span>
        <span className="beta">ALPHA</span>
      </Link>
      <nav className="top-actions" aria-label="Links do projeto">
        {compact && <Link className="new-replay-link" href="/">{t("header.newReplay")}</Link>}
        <span className="status"><i /> {t("header.parserOnline")}</span>
        <div className="locale-switch" aria-label="Language"><Globe2 size={14} /><button className={locale === "pt" ? "active" : ""} onClick={() => setLocale("pt")} aria-pressed={locale === "pt"}>PT</button><span>/</span><button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} aria-pressed={locale === "en"}>EN</button></div>
        <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer"><Info size={17} /> {t("header.api")}</a>
        <a href="https://github.com" target="_blank" rel="noreferrer"><Code2 size={18} /> {t("header.github")}</a>
      </nav>
    </header>
  );
}

export function SiteFooter({ watcher = false }: { watcher?: boolean }) {
  const { locale, t } = useI18n();

  return (
    <footer>
      <span>{t("footer.experimental")}</span>
      {watcher ? <span>{locale === "pt" ? "Use" : "Use"} <kbd>{locale === "pt" ? "espaço" : "space"}</kbd> {locale === "pt" ? "para play/pause e" : "to play/pause and"} <kbd>←</kbd> <kbd>→</kbd> {locale === "pt" ? "para navegar" : "to navigate"}</span> : <span>{t("footer.compatible")} <kbd>.SC2Replay</kbd></span>}
    </footer>
  );
}
