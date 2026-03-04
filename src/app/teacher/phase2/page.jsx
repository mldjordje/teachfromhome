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
import { apiGet, apiPatch, apiPost } from "@library/apiClient";

const TeacherPhase2Page = () => {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [trainingVideos, setTrainingVideos] = useState([]);
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
      setError("");
    } catch (loadError) {
      setError(loadError?.message || "Failed to load Phase 2 data.");
      setTask(null);
      setSubmissions([]);
      setTrainingVideos([]);
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
      setError("No phase 2 task assigned yet.");
      return;
    }
    if (!videoFile) {
      setError("Upload Phase 2 video before submit.");
      return;
    }
    if (videoFile.size > bytesFromMb(PHASE2_MAX_VIDEO_MB)) {
      setError(`Video is too large. Max allowed size is ${PHASE2_MAX_VIDEO_MB}MB.`);
      return;
    }
    if (videoFile.type && !ALLOWED_VIDEO_MIME_TYPES.includes(videoFile.type)) {
      setError("Unsupported video format. Please upload MP4, WEBM, or MOV.");
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

      setSuccess("Phase 2 submission sent.");
      setVideoFile(null);
      await loadData();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit phase 2");
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
      <AppShell title="Phase 2" subtitle="Watch training videos and submit assigned sentence recording.">
        {loading ? (
          <div className="tfh-alert">Loading Phase 2...</div>
        ) : !task ? (
          <div className="tfh-alert">Phase 2 task is not assigned yet. Complete Phase 1 and wait for admin decision.</div>
        ) : (
          <div className="tfh-grid">
            <div className="tfh-grid tfh-grid-3">
              <div className="tfh-card">
                <h3>Task status</h3>
                <p>
                  <StatusBadge status={task.status} />
                </p>
              </div>
              <div className="tfh-card">
                <h3>Attempts</h3>
                <p>
                  {task.current_attempts} / {task.attempts_allowed}
                </p>
              </div>
              <div className="tfh-card">
                <h3>Assigned sentence</h3>
                <p>{task.phase2_sentence}</p>
              </div>
            </div>

            {task.last_feedback && <div className="tfh-alert">Admin feedback: {task.last_feedback}</div>}

            <div className="tfh-card">
              <h3>Training videos</h3>
              {trainingVideos.length ? (
                <div className="tfh-grid tfh-grid-2">
                  {trainingVideos.map((video) => (
                    <div className="tfh-card" key={video.id}>
                      <h4>{video.title}</h4>
                      <p>Category: {video.category}</p>
                      <video controls width="100%" src={video.storage_blob_url} onEnded={() => markVideoViewed(video.id)} />
                    </div>
                  ))}
                </div>
              ) : (
                <p>No active training videos yet.</p>
              )}
            </div>

            <div className="tfh-card">
              <h3>Submit Phase 2 video</h3>
              <form className="tfh-form" onSubmit={onSubmit}>
                <div>
                  <label>Upload your recording</label>
                  <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                  <small>Max {PHASE2_MAX_VIDEO_MB}MB (MP4/WEBM/MOV)</small>
                </div>
                {error && <div className="tfh-alert tfh-error">{error}</div>}
                {success && <div className="tfh-alert tfh-success">{success}</div>}
                <div className="tfh-actions">
                  <button type="submit" className="tfh-btn" disabled={!canSubmit}>
                    {busy ? "Submitting..." : "Submit Phase 2"}
                  </button>
                </div>
              </form>
            </div>

            <div className="tfh-card">
              <h3>Submission history</h3>
              {submissions.length ? (
                <div className="tfh-mobile-list">
                  {submissions.map((row) => (
                    <article key={row.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>Attempt {row.attempt_no}</strong>
                        <StatusBadge status={row.status} />
                      </div>
                      <p>Feedback: {row.feedback || "-"}</p>
                      <p>{new Date(row.created_at).toLocaleString()}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No phase 2 submissions yet.</p>
              )}
              {latestSubmission?.status === "accepted" && <div className="tfh-alert tfh-success">Approved. You will be contacted soon.</div>}
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase2Page;
