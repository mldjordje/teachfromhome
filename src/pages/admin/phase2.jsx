import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner, Textarea } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { getAccessTokenOrThrow } from "@library/auth";
import { splitStoragePath } from "@library/storage";

const AdminPhase2Page = () => {
  const { supabase } = useAuth();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [feedbackMap, setFeedbackMap] = useState({});
  const [videoUrls, setVideoUrls] = useState({});

  const loadRows = async () => {
    if (!supabase) {
      setError("Supabase client missing.");
      setRows([]);
      setLoading(false);
      return;
    }

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
    if (!supabase || !row.latest_video_path) return;

    const parsed = splitStoragePath(row.latest_video_path);
    if (!parsed) return;

    const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60 * 60);
    if (data?.signedUrl) {
      setVideoUrls((prev) => ({ ...prev, [row.task_id]: data.signedUrl }));
    }
  };

  const reviewAction = async (row, action) => {
    if (!supabase) return;

    if (!row.latest_submission_id) {
      setError("No submission available for this task.");
      return;
    }

    setBusyTaskId(row.task_id);
    setError("");

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);

      await callEdgeFunction({
        functionName: "admin_review_phase2",
        accessToken,
        body: {
          action,
          task_id: row.task_id,
          submission_id: row.latest_submission_id,
          feedback: feedbackMap[row.task_id] || null,
        },
      });

      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Review action failed.");
    }

    setBusyTaskId("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Phase 2 Queue" subtitle="Review latest Phase 2 submissions and decide accept/retry/reject.">
        <Card className="mb-4">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="assigned">Assigned</option>
              <option value="submitted">Submitted</option>
              <option value="retry">Retry</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button variant="bordered" onPress={loadRows}>Refresh</Button>
          </CardBody>
        </Card>

        {error && <Alert color="danger" title={error} className="mb-4" />}

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Phase 2 queue</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Loading Phase 2 queue...</p>
              </div>
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
                              <Button
                                as="a"
                                href={videoUrls[row.task_id]}
                                target="_blank"
                                rel="noreferrer"
                                size="sm"
                                variant="bordered"
                              >
                                Open video
                              </Button>
                            ) : (
                              <Button size="sm" variant="bordered" onPress={() => openVideo(row)}>
                                Generate video link
                              </Button>
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {row.latest_submission_id && ["submitted", "retry", "assigned"].includes(row.task_status) ? (
                            <div className="flex min-w-[220px] flex-col gap-2">
                              <Textarea
                                size="sm"
                                label="Feedback"
                                labelPlacement="outside"
                                placeholder="Feedback for retry/reject"
                                value={feedbackMap[row.task_id] || ""}
                                onValueChange={(value) =>
                                  setFeedbackMap((prev) => ({
                                    ...prev,
                                    [row.task_id]: value,
                                  }))
                                }
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  color="success"
                                  onPress={() => reviewAction(row, "accept")}
                                  isLoading={busyTaskId === row.task_id}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  color="warning"
                                  variant="flat"
                                  onPress={() => reviewAction(row, "retry")}
                                  isLoading={busyTaskId === row.task_id}
                                >
                                  Retry
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="flat"
                                  onPress={() => reviewAction(row, "reject")}
                                  isLoading={busyTaskId === row.task_id}
                                >
                                  Reject
                                </Button>
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
          </CardBody>
        </Card>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase2Page;
