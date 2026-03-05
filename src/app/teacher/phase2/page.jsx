"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { getFileExt } from "@library/storage";
import { trackEvent, getAnalyticsSessionId } from "@library/analytics";
import { ALLOWED_VIDEO_MIME_TYPES, PHASE2_MAX_VIDEO_MB, bytesFromMb } from "@config/uploadLimits";
import { extractYouTubeVideoId, toYouTubeEmbedUrl } from "@library/youtube";
import { apiGet, apiPatch, apiPost } from "@library/apiClient";

const TeacherPhase2Page = () => {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [trainingVideos, setTrainingVideos] = useState([]);
  const [showcaseVideos, setShowcaseVideos] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const payload = await apiGet("/api/teacher/phase2");
      setTask(payload.task || null);
      setSubmissions(payload.submissions || []);
      setTrainingVideos(payload.trainingVideos || []);
      setShowcaseVideos(payload.showcaseVideos || []);
      setError("");
    } catch (loadError) {
      setError(loadError?.message || "Neuspesno ucitavanje podataka za fazu 2.");
      setTask(null);
      setSubmissions([]);
      setTrainingVideos([]);
      setShowcaseVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const latestSubmission = useMemo(() => submissions[submissions.length - 1] || null, [submissions]);
  const canSubmit = task && ["assigned", "retry"].includes(task.status) && task.current_attempts < task.attempts_allowed && !busy;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!task) {
      setError("Zadatak za fazu 2 jos nije dodeljen.");
      return;
    }
    if (!videoFile) {
      setError("Postavite video za fazu 2 pre slanja.");
      return;
    }
    if (videoFile.size > bytesFromMb(PHASE2_MAX_VIDEO_MB)) {
      setError(`Video je prevelik. Maksimalna velicina je ${PHASE2_MAX_VIDEO_MB}MB.`);
      return;
    }
    if (videoFile.type && !ALLOWED_VIDEO_MIME_TYPES.includes(videoFile.type)) {
      setError("Nepodrzan format videa. Koristite MP4, WEBM ili MOV.");
      return;
    }

    setBusy(true);
    const nextAttempt = (task.current_attempts || 0) + 1;
    const ext = getFileExt(videoFile.name);
    const pathname = `phase2/${user.id}/phase2-attempt-${nextAttempt}-${Date.now()}.${ext}`;

    try {
      const blob = await upload(pathname, videoFile, {
        access: "public",
        handleUploadUrl: "/api/blob/upload-token",
        clientPayload: JSON.stringify({ kind: "phase2" }),
      });

      await apiPost("/api/teacher/phase2/submit", {
        task_id: task.id,
        video_blob_key: blob.pathname,
        video_blob_url: blob.url,
        session_id: getAnalyticsSessionId(),
      });

      await trackEvent({
        eventName: "phase2_submitted",
        metadata: { attempt_no: nextAttempt },
      });

      setSuccess("Prijava za fazu 2 je uspesno poslata.");
      setVideoFile(null);
      await loadData();
    } catch (submitError) {
      setError(submitError.message || "Slanje faze 2 nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const markVideoViewed = async (videoId) => {
    try {
      await apiPatch("/api/teacher/phase2", {
        action: "mark_video_viewed",
        training_video_id: videoId,
      });
    } catch (_error) {
      // no-op
    }
  };

  return (
    <RequireAuth>
      <AppShell title="Faza 2" subtitle="Pogledaj trening klipove i pošalji snimak dodeljene rečenice.">
        {loading ? (
          <div className="tfh-alert">Ucitavanje faze 2...</div>
        ) : !task ? (
          <div className="tfh-alert">Zadatak za fazu 2 jos nije dodeljen. Zavrsite fazu 1 i sacekajte admin odluku.</div>
        ) : (
          <div className="tfh-grid">
            <div className="tfh-grid tfh-grid-3">
              <div className="tfh-card">
                <h3>Status zadatka</h3>
                <p>
                  <StatusBadge status={task.status} />
                </p>
              </div>
              <div className="tfh-card">
                <h3>Pokusaji</h3>
                <p>
                  {task.current_attempts} / {task.attempts_allowed}
                </p>
              </div>
              <div className="tfh-card">
                <h3>Dodeljena recenica</h3>
                <p>{task.phase2_sentence}</p>
              </div>
            </div>

            {task.last_feedback && <div className="tfh-alert">Admin feedback: {task.last_feedback}</div>}

            <div className="tfh-card">
              <h3>Trening klipovi</h3>
              {trainingVideos.length ? (
                <div className="tfh-grid tfh-grid-2">
                  {trainingVideos.map((video) => (
                    <div className="tfh-card" key={video.id}>
                      <h4>{video.title}</h4>
                      <p>Kategorija: {video.category}</p>
                      <video controls width="100%" src={video.storage_blob_url} onEnded={() => markVideoViewed(video.id)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p>Trenutno nema aktivnih trening klipova.</p>
              )}
            </div>

            <div className="tfh-card">
              <h3>Showcase klipovi (YouTube)</h3>
              {showcaseVideos.length ? (
                <div className="tfh-showcase-grid tfh-showcase-grid--compact">
                  {showcaseVideos.map((video) => {
                    const videoId = video.youtube_video_id || extractYouTubeVideoId(video.youtube_url);
                    const embedUrl = toYouTubeEmbedUrl(videoId);
                    if (!embedUrl) return null;
                    return (
                      <article key={video.id} className="tfh-showcase-card">
                        <div className="tfh-showcase-frame-wrap">
                          <iframe
                            src={embedUrl}
                            title={video.title || "Showcase klip"}
                            className="tfh-showcase-frame"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                          />
                        </div>
                        <h3>{video.title || "Showcase klip"}</h3>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p>Trenutno nema aktivnih showcase klipova.</p>
              )}
            </div>

            <div className="tfh-card">
              <h3>Posalji video za fazu 2</h3>
              <form className="tfh-form" onSubmit={onSubmit}>
                <div>
                  <label>Postavi snimak</label>
                  <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                  <small>Max {PHASE2_MAX_VIDEO_MB}MB (MP4/WEBM/MOV)</small>
                </div>
                {error && <div className="tfh-alert tfh-error">{error}</div>}
                {success && <div className="tfh-alert tfh-success">{success}</div>}
                <div className="tfh-actions">
                  <button type="submit" className="tfh-btn" disabled={!canSubmit}>
                    {busy ? "Slanje..." : "Posalji fazu 2"}
                  </button>
                </div>
              </form>
            </div>

            <div className="tfh-card">
              <h3>Istorija slanja</h3>
              {submissions.length ? (
                <div className="tfh-mobile-list">
                  {submissions.map((row) => (
                    <article key={row.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>Pokusaj {row.attempt_no}</strong>
                        <StatusBadge status={row.status} />
                      </div>
                      <p>Feedback: {row.feedback || "-"}</p>
                      <p>{new Date(row.created_at).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>Jos nema slanja za fazu 2.</p>
              )}
              {latestSubmission?.status === "accepted" && <div className="tfh-alert tfh-success">Prijava je odobrena. Tim ce vas uskoro kontaktirati.</div>}
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase2Page;
