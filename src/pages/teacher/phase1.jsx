import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { getFileExt } from "@library/storage";
import { trackEvent } from "@library/analytics";
import { ALLOWED_VIDEO_MIME_TYPES, PHASE1_MAX_VIDEO_MB, bytesFromMb } from "@config/uploadLimits";

const TeacherPhase1Page = () => {
  const { supabase, user, profile, session, refreshAuthState, isConfigured, configError } = useAuth();
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
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: attemptsError } = await supabase
        .from("teacher_phase1_submissions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("attempt_no", { ascending: true });

      if (attemptsError) {
        throw attemptsError;
      }

      setAttempts(data ?? []);
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
  }, [user]);

  const latest = useMemo(() => attempts[attempts.length - 1] || null, [attempts]);
  const attemptsLeft = Math.max(0, 3 - attempts.length);
  const canSubmit = !busy && attemptsLeft > 0 && latest?.status !== "pending" && latest?.status !== "moved_to_phase2";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase || !isConfigured) {
      setError(configError || "Supabase is not configured.");
      return;
    }
    if (!user) {
      setError("Missing user session.");
      return;
    }
    if (!session?.access_token) {
      setError("Missing auth session.");
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
    const objectPath = `${user.id}/phase1-attempt-${nextAttempt}-${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage.from("phase1-videos").upload(objectPath, videoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: videoFile.type || "video/mp4",
      });

      if (uploadError) {
        throw uploadError;
      }

      await callEdgeFunction({
        functionName: "teacher_submit_phase1",
        accessToken: session.access_token,
        body: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dateOfBirth,
          phone,
          email: user.email,
          short_about: shortAbout,
          video_path: `phase1-videos/${objectPath}`,
          script_text: scriptText,
        },
      });

      await trackEvent({
        eventName: "phase1_submitted",
        metadata: { attempt_no: nextAttempt },
        accessToken: session.access_token,
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

          {latest?.status === "pending" && (
            <div className="tfh-alert">Your latest attempt is pending review. Wait for admin decision.</div>
          )}

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
              <div className="tfh-table-wrap">
                <table className="tfh-table">
                  <thead>
                    <tr>
                      <th>Attempt</th>
                      <th>Status</th>
                      <th>Reject reason</th>
                      <th>Admin notes</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((row) => (
                      <tr key={row.id}>
                        <td>{row.attempt_no}</td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td>{row.reject_reason || "-"}</td>
                        <td>{row.admin_notes || "-"}</td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
