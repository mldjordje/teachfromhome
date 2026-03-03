import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner, Textarea } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { getAccessTokenOrThrow } from "@library/auth";
import { splitStoragePath } from "@library/storage";

const AdminPhase1Page = () => {
  const { supabase } = useAuth();
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
    if (!supabase) {
      setError("Supabase client missing.");
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let query = supabase.from("admin_phase1_queue").select("*").order("created_at", { ascending: false });

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
    if (!supabase) return;

    const parsed = splitStoragePath(row.video_path);
    if (!parsed) return;

    const { data } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.objectPath, 60 * 60);
    if (data?.signedUrl) {
      setVideoUrls((prev) => ({ ...prev, [row.submission_id]: data.signedUrl }));
    }
  };

  const moveToPhase2 = async (row) => {
    if (!supabase) return;

    const sentence = phase2Sentences[row.submission_id]?.trim();
    if (!sentence) {
      setError("Phase 2 sentence is required.");
      return;
    }

    setBusyId(row.submission_id);
    setError("");

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);

      await callEdgeFunction({
        functionName: "admin_move_to_phase2",
        accessToken,
        body: {
          user_id: row.user_id,
          submission_id: row.submission_id,
          phase2_sentence: sentence,
        },
      });

      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Move to phase2 failed.");
    }

    setBusyId("");
  };

  const rejectPhase1 = async (row) => {
    if (!supabase) return;

    const reason = rejectReasons[row.submission_id] || "bad_pronunciation";
    const notes = rejectNotes[row.submission_id] || "";

    setBusyId(row.submission_id);
    setError("");

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);

      await callEdgeFunction({
        functionName: "admin_reject_phase1",
        accessToken,
        body: {
          user_id: row.user_id,
          submission_id: row.submission_id,
          reason,
          notes,
        },
      });

      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Reject failed.");
    }

    setBusyId("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Phase 1 Queue" subtitle="Review submissions, reject, or move candidate to Phase 2.">
        <Card className="mb-4">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="moved_to_phase2">Moved to phase2</option>
            </select>
            <Button variant="bordered" onPress={loadRows}>Refresh</Button>
          </CardBody>
        </Card>

        {error && <Alert color="danger" title={error} className="mb-4" />}

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Phase 1 queue</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Loading Phase 1 queue...</p>
              </div>
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
                            <Button
                              as="a"
                              href={videoUrls[row.submission_id]}
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
                          )}
                        </td>
                        <td>
                          {row.status === "pending" ? (
                            <div className="flex min-w-[240px] flex-col gap-2">
                              <Textarea
                                size="sm"
                                label="Phase 2 sentence"
                                labelPlacement="outside"
                                value={phase2Sentences[row.submission_id] || ""}
                                onValueChange={(value) =>
                                  setPhase2Sentences((prev) => ({
                                    ...prev,
                                    [row.submission_id]: value,
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                color="primary"
                                onPress={() => moveToPhase2(row)}
                                isLoading={busyId === row.submission_id}
                              >
                                Move to phase2
                              </Button>

                              <select
                                className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
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

                              <Textarea
                                size="sm"
                                label="Reject notes"
                                labelPlacement="outside"
                                value={rejectNotes[row.submission_id] || ""}
                                onValueChange={(value) =>
                                  setRejectNotes((prev) => ({
                                    ...prev,
                                    [row.submission_id]: value,
                                  }))
                                }
                              />

                              <Button
                                size="sm"
                                color="danger"
                                variant="flat"
                                onPress={() => rejectPhase1(row)}
                                isLoading={busyId === row.submission_id}
                              >
                                Reject
                              </Button>
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

export default AdminPhase1Page;
