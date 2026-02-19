import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { splitStoragePath } from "@library/storage";

const AdminPhase2Page = () => {
  const { supabase, session } = useAuth();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [feedbackMap, setFeedbackMap] = useState({});
  const [videoUrls, setVideoUrls] = useState({});

  const loadRows = async () => {
    setLoading(true);
    let query = supabase.from("admin_phase2_queue").select("*").order("task_updated_at", { ascending: false });
    if (statusFilter !== "all") {
      query = query.eq("task_status", statusFilter);
    }
    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setRows([]);
    } else {
      setError("");
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [statusFilter]);

  const openVideo = async (row) => {
    if (!row.latest_video_path) return;
    const parsed = splitStoragePath(row.latest_video_path);
    if (!parsed) return;
    const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60 * 60);
    if (data?.signedUrl) {
      setVideoUrls((prev) => ({ ...prev, [row.task_id]: data.signedUrl }));
    }
  };

  const reviewAction = async (row, action) => {
    if (!session?.access_token) return;
    if (!row.latest_submission_id) {
      setError("No submission available for this task.");
      return;
    }

    setBusyTaskId(row.task_id);
    setError("");
    try {
      await callEdgeFunction({
        functionName: "admin_review_phase2",
        accessToken: session.access_token,
        body: {
          action,
          task_id: row.task_id,
          submission_id: row.latest_submission_id,
          feedback: feedbackMap[row.task_id] || null,
        },
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message);
    }
    setBusyTaskId("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Phase 2 Queue" subtitle="Review latest phase 2 submissions and decide accept/retry/reject.">
        <div className="tfh-card">
          <div className="tfh-actions">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="assigned">Assigned</option>
              <option value="submitted">Submitted</option>
              <option value="retry">Retry</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button type="button" className="tfh-btn tfh-btn-outline" onClick={loadRows}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="tfh-alert tfh-error">{error}</div>}

        <div className="tfh-card">
          {loading ? (
            <p>Loading Phase 2 queue...</p>
          ) : rows.length ? (
            <div className="tfh-table-wrap">
              <table className="tfh-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Task</th>
                    <th>Latest submission</th>
                    <th>Video</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.task_id}>
                      <td>
                        <strong>
                          {row.first_name} {row.last_name}
                        </strong>
                        <br />
                        {row.email}
                      </td>
                      <td>
                        <StatusBadge status={row.task_status} />
                        <div>Attempts: {row.current_attempts} / {row.attempts_allowed}</div>
                        <div>Sentence: {row.phase2_sentence}</div>
                        {row.last_feedback && <div>Feedback: {row.last_feedback}</div>}
                      </td>
                      <td>
                        {row.latest_submission_id ? (
                          <>
                            <div>Attempt: {row.latest_attempt_no}</div>
                            <div>Status: <StatusBadge status={row.latest_submission_status} /></div>
                            <div>{row.latest_submission_feedback || "-"}</div>
                          </>
                        ) : (
                          <div>No submission yet</div>
                        )}
                      </td>
                      <td>
                        {row.latest_video_path ? (
                          videoUrls[row.task_id] ? (
                            <a className="tfh-btn tfh-btn-outline" href={videoUrls[row.task_id]} target="_blank" rel="noreferrer">
                              Open video
                            </a>
                          ) : (
                            <button type="button" className="tfh-btn tfh-btn-outline" onClick={() => openVideo(row)}>
                              Generate video link
                            </button>
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {row.latest_submission_id && ["submitted", "retry", "assigned"].includes(row.task_status) ? (
                          <div className="tfh-form">
                            <div>
                              <label>Feedback (for retry/reject)</label>
                              <textarea
                                value={feedbackMap[row.task_id] || ""}
                                onChange={(e) =>
                                  setFeedbackMap((prev) => ({
                                    ...prev,
                                    [row.task_id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="tfh-actions">
                              <button
                                type="button"
                                className="tfh-btn"
                                onClick={() => reviewAction(row, "accept")}
                                disabled={busyTaskId === row.task_id}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                className="tfh-btn tfh-btn-outline"
                                onClick={() => reviewAction(row, "retry")}
                                disabled={busyTaskId === row.task_id}
                              >
                                Retry
                              </button>
                              <button
                                type="button"
                                className="tfh-btn tfh-btn-outline"
                                onClick={() => reviewAction(row, "reject")}
                                disabled={busyTaskId === row.task_id}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No records found.</p>
          )}
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase2Page;
