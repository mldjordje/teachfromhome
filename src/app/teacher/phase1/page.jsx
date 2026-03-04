"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { getFileExt } from "@library/storage";
import { trackEvent, getAnalyticsSessionId } from "@library/analytics";
import { ALLOWED_VIDEO_MIME_TYPES, PHASE1_MAX_VIDEO_MB, bytesFromMb } from "@config/uploadLimits";
import { apiGet, apiPost } from "@library/apiClient";

const TeacherPhase1Page = () => {
  const { user, profile, refreshAuthState } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "");
  const [shortAbout, setShortAbout] = useState(profile?.short_about || "");
  const [scriptText, setScriptText] = useState("Hello, my name is ...");
  const [videoFile, setVideoFile] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAttempts = async () => {
    setLoading(true);
    try {
      const payload = await apiGet("/api/teacher/phase1");
      setAttempts(payload.attempts || []);
    } catch (loadError) {
      setError(loadError?.message || "Failed to load your Phase 1 attempts.");
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
    setPhone(profile?.phone || "");
    setDateOfBirth(profile?.date_of_birth || "");
    setShortAbout(profile?.short_about || "");
  }, [profile]);

  useEffect(() => {
    loadAttempts();
  }, [user?.id]);

  const latest = useMemo(() => attempts[attempts.length - 1] || null, [attempts]);
  const attemptsLeft = Math.max(0, 3 - attempts.length);
  const canSubmit = !busy && attemptsLeft > 0 && latest?.status !== "pending" && latest?.status !== "moved_to_phase2";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Missing user session.");
      return;
    }
    if (!videoFile) {
      setError("Please upload your Phase 1 intro video.");
      return;
    }
    if (videoFile.size > bytesFromMb(PHASE1_MAX_VIDEO_MB)) {
      setError(`Video is too large. Max allowed size is ${PHASE1_MAX_VIDEO_MB}MB.`);
      return;
    }
    if (videoFile.type && !ALLOWED_VIDEO_MIME_TYPES.includes(videoFile.type)) {
      setError("Unsupported video format. Please upload MP4, WEBM, or MOV.");
      return;
    }
    if (shortAbout.length > 50) {
      setError("Short about must be max 50 characters.");
      return;
    }

    setBusy(true);

    const nextAttempt = attempts.length + 1;
    const ext = getFileExt(videoFile.name);
    const pathname = `phase1/${user.id}/phase1-attempt-${nextAttempt}-${Date.now()}.${ext}`;

    try {
      const blob = await upload(pathname, videoFile, {
        access: "public",
        handleUploadUrl: "/api/blob/upload-token",
        clientPayload: JSON.stringify({ kind: "phase1" }),
      });

      await apiPost("/api/teacher/phase1/submit", {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone,
        email: user.email,
        short_about: shortAbout,
        video_blob_key: blob.pathname,
        video_blob_url: blob.url,
        script_text: scriptText,
        session_id: getAnalyticsSessionId(),
      });

      await trackEvent({
        eventName: "phase1_submitted",
        metadata: { attempt_no: nextAttempt },
      });

      setSuccess("Phase 1 submitted successfully.");
      setVideoFile(null);
      await refreshAuthState();
      await loadAttempts();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit phase 1.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireAuth>
      <AppShell title="Phase 1 Application" subtitle="Submit your profile details and intro video (max 3 attempts).">
        <div className="tfh-grid">
          <div className="tfh-grid tfh-grid-3">
            <div className="tfh-card">
              <h3>Attempts used</h3>
              <p>{attempts.length} / 3</p>
            </div>
            <div className="tfh-card">
              <h3>Attempts left</h3>
              <p>{attemptsLeft}</p>
            </div>
            <div className="tfh-card">
              <h3>Latest status</h3>
              <p>{latest ? <StatusBadge status={latest.status} /> : "No submission yet"}</p>
            </div>
          </div>

          {latest?.status === "moved_to_phase2" && (
            <div className="tfh-alert tfh-success">Congratulations, you passed Phase 1. Go to Phase 2.</div>
          )}

          {latest?.status === "pending" && <div className="tfh-alert">Your latest attempt is pending review. Wait for admin decision.</div>}

          <div className="tfh-card">
            <h3>Submit Phase 1</h3>
            <form className="tfh-form" onSubmit={onSubmit}>
              <div className="tfh-grid tfh-grid-2">
                <div>
                  <label>First name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label>Last name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <div>
                  <label>Date of birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                </div>
                <div>
                  <label>Phone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>

              <div>
                <label>Email (must match auth email)</label>
                <input value={user?.email || ""} readOnly />
              </div>
              <div>
                <label>Short about (max 50 chars)</label>
                <input value={shortAbout} maxLength={50} onChange={(e) => setShortAbout(e.target.value)} required />
              </div>
              <div>
                <label>Script text (4-5 sentences)</label>
                <textarea value={scriptText} onChange={(e) => setScriptText(e.target.value)} />
              </div>
              <div>
                <label>Intro video</label>
                <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                <small>Max {PHASE1_MAX_VIDEO_MB}MB (MP4/WEBM/MOV)</small>
              </div>

              {error && <div className="tfh-alert tfh-error">{error}</div>}
              {success && <div className="tfh-alert tfh-success">{success}</div>}

              <div className="tfh-actions">
                <button type="submit" className="tfh-btn" disabled={!canSubmit}>
                  {busy ? "Submitting..." : "Submit Phase 1"}
                </button>
              </div>
            </form>
          </div>

          <div className="tfh-card">
            <h3>Attempt history</h3>
            {loading ? (
              <p>Loading attempts...</p>
            ) : attempts.length ? (
              <div className="tfh-mobile-list">
                {attempts.map((row) => (
                  <article key={row.id} className="tfh-mobile-item">
                    <div className="tfh-mobile-item-top">
                      <strong>Attempt {row.attempt_no}</strong>
                      <StatusBadge status={row.status} />
                    </div>
                    <p>Reject reason: {row.reject_reason || "-"}</p>
                    <p>Admin notes: {row.admin_notes || "-"}</p>
                    <p>{new Date(row.created_at).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p>No attempts yet.</p>
            )}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase1Page;
