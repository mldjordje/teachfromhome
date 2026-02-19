import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { splitStoragePath } from "@library/storage";

const AdminPhase1Page = () => {
  const { supabase, session } = useAuth();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoUrls, setVideoUrls] = useState({});
  const [busyId, setBusyId] = useState("");
  const [phase2Sentences, setPhase2Sentences] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectNotes, setRejectNotes] = useState({});

  const loadRows = async () => {
    setLoading(true);
    let query = supabase
      .from("admin_phase1_queue")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setRows([]);
    } else {
      setRows(data ?? []);
      setError("");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [statusFilter]);

  const openVideo = async (row) => {
    const parsed = splitStoragePath(row.video_path);
    if (!parsed) return;
    const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60 * 60);
    if (data?.signedUrl) {
      setVideoUrls((prev) => ({ ...prev, [row.submission_id]: data.signedUrl }));
    }
  };

  const moveToPhase2 = async (row) => {
    if (!session?.access_token) return;
    const sentence = phase2Sentences[row.submission_id]?.trim();
    if (!sentence) {
      setError("Phase 2 sentence is required.");
      return;
    }

    setBusyId(row.submission_id);
    setError("");
    try {
      await callEdgeFunction({
        functionName: "admin_move_to_phase2",
        accessToken: session.access_token,
        body: {
          user_id: row.user_id,
          submission_id: row.submission_id,
          phase2_sentence: sentence,
        },
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message);
    }
    setBusyId("");
  };

  const rejectPhase1 = async (row) => {
    if (!session?.access_token) return;
    const reason = rejectReasons[row.submission_id] || "bad_pronunciation";
    const notes = rejectNotes[row.submission_id] || "";

    setBusyId(row.submission_id);
    setError("");
    try {
      await callEdgeFunction({
        functionName: "admin_reject_phase1",
        accessToken: session.access_token,
        body: {
          user_id: row.user_id,
          submission_id: row.submission_id,
          reason,
          notes,
        },
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message);
    }
    setBusyId("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Phase 1 Queue" subtitle="Review submissions, reject, or move candidate to Phase 2.">
        <div className="tfh-card">
          <div className="tfh-actions">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="moved_to_phase2">Moved to phase2</option>
            </select>
            <button type="button" className="tfh-btn tfh-btn-outline" onClick={loadRows}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="tfh-alert tfh-error">{error}</div>}

        <div className="tfh-card">
          {loading ? (
            <p>Loading Phase 1 queue...</p>
          ) : rows.length ? (
            <div className="tfh-table-wrap">
              <table className="tfh-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Attempt</th>
                    <th>Status</th>
                    <th>Video</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.submission_id}>
                      <td>
                        <strong>
                          {row.first_name} {row.last_name}
                        </strong>
                        <br />
                        {row.email}
                        <br />
                        {row.phone || "-"}
                      </td>
                      <td>{row.attempt_no}</td>
                      <td>
                        <StatusBadge status={row.status} />
                        {row.reject_reason && <div>Reason: {row.reject_reason}</div>}
                        {row.admin_notes && <div>Note: {row.admin_notes}</div>}
                      </td>
                      <td>
                        {videoUrls[row.submission_id] ? (
                          <a className="tfh-btn tfh-btn-outline" href={videoUrls[row.submission_id]} target="_blank" rel="noreferrer">
                            Open video
                          </a>
                        ) : (
                          <button type="button" className="tfh-btn tfh-btn-outline" onClick={() => openVideo(row)}>
                            Generate video link
                          </button>
                        )}
                      </td>
                      <td>
                        {row.status === "pending" ? (
                          <div className="tfh-form">
                            <div>
                              <label>Phase 2 sentence</label>
                              <textarea
                                value={phase2Sentences[row.submission_id] || ""}
                                onChange={(e) =>
                                  setPhase2Sentences((prev) => ({
                                    ...prev,
                                    [row.submission_id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="tfh-actions">
                              <button
                                type="button"
                                className="tfh-btn"
                                onClick={() => moveToPhase2(row)}
                                disabled={busyId === row.submission_id}
                              >
                                Move to phase2
                              </button>
                            </div>

                            <div>
                              <label>Reject reason</label>
                              <select
                                value={rejectReasons[row.submission_id] || "bad_pronunciation"}
                                onChange={(e) =>
                                  setRejectReasons((prev) => ({
                                    ...prev,
                                    [row.submission_id]: e.target.value,
                                  }))
                                }
                              >
                                <option value="bad_accent">bad_accent</option>
                                <option value="bad_pronunciation">bad_pronunciation</option>
                                <option value="low_energy">low_energy</option>
                              </select>
                            </div>
                            <div>
                              <label>Reject notes</label>
                              <textarea
                                value={rejectNotes[row.submission_id] || ""}
                                onChange={(e) =>
                                  setRejectNotes((prev) => ({
                                    ...prev,
                                    [row.submission_id]: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div className="tfh-actions">
                              <button
                                type="button"
                                className="tfh-btn tfh-btn-outline"
                                onClick={() => rejectPhase1(row)}
                                disabled={busyId === row.submission_id}
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

export default AdminPhase1Page;
