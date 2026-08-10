"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Activity, BookOpen, Bot, BrainCircuit, Crosshair, Factory, FileUp, FlaskConical, HeartHandshake, History, Map, MessageCircleQuestion, PackageOpen, Play, Sparkles, Upload, Zap } from "lucide-react";

import { useI18n } from "@/components/i18n";
import { useReplay } from "@/components/replay-context";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { ReplayData } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010";
const API_TIMEOUT_MS = 120_000;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const subscribeToHostname = () => () => undefined;
const isLocalhost = () => LOCAL_HOSTS.has(window.location.hostname);
const isServer = () => false;

async function fetchApi(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export function UploadScreen() {
  const router = useRouter();
  const { setReplay } = useReplay();
  const { locale, t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const showDemo = useSyncExternalStore(subscribeToHostname, isLocalhost, isServer);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const openWatcher = useCallback((data: ReplayData) => {
    setReplay(data);
    router.push("/watcher");
  }, [router, setReplay]);

  const uploadReplay = useCallback(async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".sc2replay")) {
      setError(t("upload.invalid"));
      return;
    }

    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetchApi(`${API_URL}/api/replays/parse`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) {
        const fallback = response.status === 413 ? t("upload.tooLarge") : response.status === 415 ? t("upload.invalid") : t("upload.failed");
        throw new Error(locale === "pt" && body.detail ? body.detail : fallback);
      }
      openWatcher(body as ReplayData);
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "AbortError" ? t("upload.timeout") : reason instanceof Error ? reason.message : t("upload.unavailable"));
    } finally {
      setUploading(false);
    }
  }, [locale, openWatcher, t]);

  const openDemo = useCallback(async () => {
    setUploading(true);
    setError(null);
    try {
      const response = await fetchApi(`${API_URL}/api/replays/demo`);
      if (!response.ok) throw new Error(t("upload.failed"));
      openWatcher(await response.json() as ReplayData);
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "AbortError" ? t("upload.timeout") : reason instanceof Error ? reason.message : t("upload.unavailable"));
    } finally {
      setUploading(false);
    }
  }, [openWatcher, t]);

  return (
    <div className="app-shell landing-shell">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />
      <SiteHeader />
      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow"><Zap size={14} /> {t("home.eyebrow")}</p>
            <h1>{t("home.titleLine1")}<br /><span>{t("home.titleLine2")}</span></h1>
            <p>{t("home.description")}</p>
          </div>

          <div className="upload-card">
            <div className="upload-card-glow" />
            <div className="upload-card-heading">
              <span><i /> {t("upload.title")}</span>
              <small>{t("upload.limit")}</small>
            </div>
            <div
              className={`dropzone landing-dropzone ${dragging ? "is-dragging" : ""}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); uploadReplay(event.dataTransfer.files[0]); }}
            >
              <div className="scan-line" />
              <input ref={fileInput} type="file" accept=".SC2Replay" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; uploadReplay(file); }} />
              <div className={`upload-icon ${uploading ? "is-loading" : ""}`}><FileUp size={28} /></div>
              <div className="upload-message">
                <strong>{uploading ? t("upload.processing") : t("upload.drop")}</strong>
                <span>{uploading ? t("upload.processingHint") : t("upload.dropHint")}</span>
              </div>
              <button className="primary-upload" onClick={() => fileInput.current?.click()} disabled={uploading}>
                <Upload size={16} /> {uploading ? t("upload.processingButton") : t("upload.select")}
              </button>
            </div>
            {showDemo && <button className="demo-button" onClick={openDemo} disabled={uploading}>
              <Play size={14} fill="currentColor" /> {t("upload.demo")}
            </button>}
            {error && <div className="landing-error" role="alert">{error}</div>}
          </div>
        </section>

        <div className="section-label"><span>{t("features.label")}</span><i /></div>
        <section className="landing-capabilities" aria-label={t("features.label")}>
          <article className="capability-card capability-coach">
            <header><span><Bot size={20} /></span><small>{t("features.coachTag")}</small></header>
            <div><strong>{t("features.coachTitle")}</strong><p>{t("features.coachText")}</p></div>
            <aside><span><MessageCircleQuestion size={11} />{t("features.coachQuestions")}</span><span><Sparkles size={11} />DeepSeek V4 Flash</span></aside>
          </article>
          <article className="capability-card capability-model">
            <header><span><BrainCircuit size={18} /></span><small>{t("features.modelTag")}</small></header>
            <strong>{t("features.modelTitle")}</strong>
            <p>{t("features.modelText")}</p>
            <div className="capability-probability" aria-hidden="true"><div><span>PLAYER 1 <b>58%</b></span><span><b>42%</b> PLAYER 2</span></div><i><em /><em /></i></div>
          </article>
          <article className="capability-card"><header><span><Crosshair size={18} /></span><small>{t("features.combatTag")}</small></header><strong>{t("features.combatTitle")}</strong><p>{t("features.combatText")}</p></article>
          <article className="capability-card"><header><span><Factory size={18} /></span><small>{t("features.macroTag")}</small></header><strong>{t("features.macroTitle")}</strong><p>{t("features.macroText")}</p></article>
          <article className="capability-card"><header><span><FlaskConical size={18} /></span><small>{t("features.armyTag")}</small></header><strong>{t("features.armyTitle")}</strong><p>{t("features.armyText")}</p></article>
          <article className="capability-card"><header><span><History size={18} /></span><small>{t("features.timelineTag")}</small></header><strong>{t("features.timelineTitle")}</strong><p>{t("features.timelineText")}</p></article>
          <article className="capability-card"><header><span><Map size={18} /></span><small>{t("features.mapTag")}</small></header><strong>{t("features.mapTitle")}</strong><p>{t("features.mapText")}</p></article>
        </section>

        <section className="community-callout">
          <span className="community-icon"><HeartHandshake size={25} /></span>
          <div><small>{t("community.eyebrow")}</small><strong>{t("community.title")}</strong><p>{t("community.text")}</p></div>
          <aside><span><i />LOTV · 1V1</span><span><Activity size={10} />{t("community.evolving")}</span><span><Sparkles size={10} />{t("community.feedback")}</span></aside>
        </section>

        <section className="community-callout research-callout">
          <span className="community-icon research-icon"><BrainCircuit size={25} /></span>
          <div><small>{t("research.eyebrow")}</small><strong>{t("research.title")}</strong><p>{t("research.text")}</p></div>
          <aside><span><PackageOpen size={10} />{t("research.weights")}</span><span><BookOpen size={10} />{t("research.paper")}</span></aside>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
