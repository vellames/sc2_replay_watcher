"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, FileUp, LockKeyhole, Map, Play, ShieldCheck, Sparkles, Upload, Zap } from "lucide-react";

import { useI18n } from "@/components/i18n";
import { useReplay } from "@/components/replay-context";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import type { ReplayData } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8010";

export function UploadScreen() {
  const router = useRouter();
  const { setReplay } = useReplay();
  const { locale, t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      const response = await fetch(`${API_URL}/api/replays/parse`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) {
        const fallback = response.status === 413 ? t("upload.tooLarge") : response.status === 415 ? t("upload.invalid") : t("upload.failed");
        throw new Error(locale === "pt" && body.detail ? body.detail : fallback);
      }
      openWatcher(body as ReplayData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("upload.unavailable"));
    } finally {
      setUploading(false);
    }
  }, [locale, openWatcher, t]);

  const openDemo = useCallback(async () => {
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/replays/demo`);
      if (!response.ok) throw new Error(t("upload.failed"));
      openWatcher(await response.json() as ReplayData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("upload.unavailable"));
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
            <div className="premium-pill"><Sparkles size={13} /><span>TACTICAL REPLAY INTELLIGENCE</span><i /></div>
            <p className="eyebrow"><Zap size={14} /> {t("home.eyebrow")}</p>
            <h1>{t("home.titleLine1")}<br /><span>{t("home.titleLine2")}</span></h1>
            <p>{t("home.description")}</p>
            <div className="product-proof"><span><LockKeyhole size={13} /> {t("home.proofPrivate")}</span><i /><span><Zap size={13} /> {t("home.proofFast")}</span></div>
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
              <input ref={fileInput} type="file" accept=".SC2Replay" hidden onChange={(event) => uploadReplay(event.target.files?.[0])} />
              <div className={`upload-icon ${uploading ? "is-loading" : ""}`}><FileUp size={28} /></div>
              <div className="upload-message">
                <strong>{uploading ? t("upload.processing") : t("upload.drop")}</strong>
                <span>{uploading ? t("upload.processingHint") : t("upload.dropHint")}</span>
              </div>
              <button className="primary-upload" onClick={() => fileInput.current?.click()} disabled={uploading}>
                <Upload size={16} /> {uploading ? t("upload.processingButton") : t("upload.select")}
              </button>
            </div>
            <button className="demo-button" onClick={openDemo} disabled={uploading}>
              <Play size={14} fill="currentColor" /> {t("upload.demo")}
            </button>
            {error && <div className="landing-error" role="alert">{error}</div>}
          </div>
        </section>

        <div className="section-label"><span>{t("steps.label")}</span><i /></div>
        <section className="landing-features" aria-label={t("steps.label")}>
          <div><span className="feature-number">01</span><Activity size={20} /><div><strong>{t("steps.oneTitle")}</strong><p>{t("steps.oneText")}</p></div></div>
          <div><span className="feature-number">02</span><Map size={20} /><div><strong>{t("steps.twoTitle")}</strong><p>{t("steps.twoText")}</p></div></div>
          <div><span className="feature-number">03</span><ShieldCheck size={20} /><div><strong>{t("steps.threeTitle")}</strong><p>{t("steps.threeText")}</p></div></div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
