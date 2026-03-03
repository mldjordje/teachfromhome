import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { getAccessTokenOrThrow } from "@library/auth";
import { getFileExt } from "@library/storage";
import { trackEvent } from "@library/analytics";
import { ALLOWED_VIDEO_MIME_TYPES, PHASE2_MAX_VIDEO_MB, bytesFromMb } from "@config/uploadLimits";

const TeacherPhase2Page = () => {
  const { supabase, user, isConfigured, configError } = useAuth();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [trainingVideos, setTrainingVideos] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [
        { data: taskData, error: taskError },
        { data: submissionsData, error: submissionsError },
        { data: videosData, error: videosError },
      ] = await Promise.all([
        supabase.from("teacher_phase2_tasks").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("teacher_phase2_submissions")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_deleted", false)
          .order("attempt_no", { ascending: true }),
        supabase
          .from("training_videos")
          .select("*")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("order_index", { ascending: true }),
      ]);

      const firstError = taskError || submissionsError || videosError;
      if (firstError) {
        throw firstError;
      }

      const safeVideos = videosData ?? [];
      const signedVideos = await Promise.all(
        safeVideos.map(async (video) => {
          const { data: signed } = await supabase.storage.from("training-videos").createSignedUrl(video.storage_path, 60 * 60);
          return { ...video, signed_url: signed?.signedUrl || null };
        }),
      );

      setTask(taskData ?? null);
      setSubmissions(submissionsData ?? []);
      setTrainingVideos(signedVideos);
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
  }, [user]);

  const latestSubmission = useMemo(() => submissions[submissions.length - 1] || null, [submissions]);
  const canSubmit = task && ["assigned", "retry"].includes(task.status) && task.current_attempts < task.attempts_allowed && !busy;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase || !isConfigured) {
      setError(configError || "Supabase is not configured.");
      return;
    }
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
    const objectPath = `${user.id}/phase2-attempt-${nextAttempt}-${Date.now()}.${ext}`;

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);

      const { error: uploadError } = await supabase.storage.from("phase2-videos").upload(objectPath, videoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: videoFile.type || "video/mp4",
      });

      if (uploadError) {
        throw uploadError;
      }

      await callEdgeFunction({
        functionName: "teacher_create_phase2_submission",
        accessToken,
        body: {
          task_id: task.id,
          video_path: `phase2-videos/${objectPath}`,
        },
      });

      await trackEvent({
        eventName: "phase2_submitted",
        metadata: { attempt_no: nextAttempt },
        accessToken,
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
    if (!user) return;
    await supabase.from("teacher_training_video_views").upsert({
      user_id: user.id,
      training_video_id: videoId,
    });
  };

  return (
    <RequireAuth>
      <AppShell title="Phase 2" subtitle="Watch training videos and submit assigned sentence recording.">
        {loading ? (
          <div className="tfh-alert">Loading Phase 2...</div>
        ) : !task ? (
          <div className="tfh-alert">
            Phase 2 task is not assigned yet. Complete Phase 1 and wait for admin decision.
          </div>
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
                      {video.signed_url ? (
                        <video
                          controls
                          width="100%"
                          src={video.signed_url}
                          onEnded={() => markVideoViewed(video.id)}
                        />
                      ) : (
                        <p>Could not generate secure video URL.</p>
                      )}
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
                <div className="tfh-table-wrap">
                  <table className="tfh-table">
                    <thead>
                      <tr>
                        <th>Attempt</th>
                        <th>Status</th>
                        <th>Feedback</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((row) => (
                        <tr key={row.id}>
                          <td>{row.attempt_no}</td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                          <td>{row.feedback || "-"}</td>
                          <td>{new Date(row.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No phase 2 submissions yet.</p>
              )}
              {latestSubmission?.status === "accepted" && (
                <div className="tfh-alert tfh-success">Approved. You will be contacted soon.</div>
              )}
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase2Page;
