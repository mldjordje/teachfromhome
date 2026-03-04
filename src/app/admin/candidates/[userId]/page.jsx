"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner, Textarea } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { apiGet, apiPost } from "@library/apiClient";

const AdminCandidateDetailPage = () => {
  const params = useParams();
  const userId = params?.userId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [phase2Sentence, setPhase2Sentence] = useState("");
  const [rejectReason, setRejectReason] = useState("bad_pronunciation");
  const [rejectNotes, setRejectNotes] = useState("");
  const [phase2Feedback, setPhase2Feedback] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const payload = await apiGet(`/api/admin/candidates/${userId}`);
      setData(payload);
      setPhase2Sentence(payload?.phase2_task?.phase2_sentence || "");
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load candidate detail");
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const pendingPhase1 = useMemo(() => {
    if (!data?.phase1_attempts?.length) return null;
    return [...data.phase1_attempts].reverse().find((row) => row.status === "pending") || null;
  }, [data]);

  const latestSubmittedPhase2 = useMemo(() => {
    if (!data?.phase2_submissions?.length) return null;
    return [...data.phase2_submissions].reverse().find((row) => row.status === "submitted") || null;
  }, [data]);

  const runAction = async (actionName, fn) => {
    setBusyAction(actionName);
    setActionMessage("");
    setError("");
    try {
      await fn();
      setActionMessage("Action completed.");
      await loadData();
    } catch (actionError) {
      setError(actionError.message || "Action failed.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Candidate Detail" subtitle="Single-candidate timeline view for Phase 1 and Phase 2 review.">
        <div className="mb-3">
          <Button as={Link} href="/admin/candidates" variant="bordered">
            Back to candidates
          </Button>
        </div>

        {error && <Alert color="danger" title={error} className="mb-4" />}
        {actionMessage && <Alert color="success" title={actionMessage} className="mb-4" />}

        {loading ? (
          <Card className="tfh-admin-panel-card">
            <CardBody className="flex items-center gap-3 py-6">
              <Spinner size="sm" />
              <p>Loading candidate...</p>
            </CardBody>
          </Card>
        ) : data ? (
          <div className="grid gap-4">
            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Profile</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <p>
                  <strong>
                    {data.profile.first_name} {data.profile.last_name}
                  </strong>
                </p>
                <p>{data.profile.email}</p>
                <p>{data.profile.phone || "-"}</p>
                <p>Current phase: {data.profile.current_phase}</p>
                <p>Short about: {data.profile.short_about || "-"}</p>
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Review actions</h3>
              </CardHeader>
              <Divider />
              <CardBody className="grid gap-4">
                {pendingPhase1 ? (
                  <div className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>Phase 1 pending attempt {pendingPhase1.attempt_no}</strong>
                      <StatusBadge status={pendingPhase1.status} />
                    </div>
                    <Textarea
                      label="Phase 2 sentence"
                      labelPlacement="outside"
                      value={phase2Sentence}
                      onValueChange={setPhase2Sentence}
                      placeholder="Sentence for Phase 2 task"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={busyAction === "phase1-move"}
                        onPress={() =>
                          runAction("phase1-move", async () => {
                            if (!phase2Sentence.trim()) {
                              throw new Error("Phase 2 sentence is required.");
                            }
                            await apiPost("/api/admin/phase1/move", {
                              user_id: data.profile.user_id,
                              submission_id: pendingPhase1.submission_id,
                              phase2_sentence: phase2Sentence.trim(),
                            });
                          })
                        }
                      >
                        Move to phase2
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <select
                        className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      >
                        <option value="bad_accent">bad_accent</option>
                        <option value="bad_pronunciation">bad_pronunciation</option>
                        <option value="low_energy">low_energy</option>
                      </select>
                      <Textarea
                        label="Reject notes"
                        labelPlacement="outside"
                        value={rejectNotes}
                        onValueChange={setRejectNotes}
                        placeholder="Optional notes"
                      />
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={busyAction === "phase1-reject"}
                        onPress={() =>
                          runAction("phase1-reject", async () => {
                            await apiPost("/api/admin/phase1/reject", {
                              user_id: data.profile.user_id,
                              submission_id: pendingPhase1.submission_id,
                              reason: rejectReason,
                              notes: rejectNotes || "",
                            });
                          })
                        }
                      >
                        Reject Phase 1
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p>No pending Phase 1 action.</p>
                )}

                {latestSubmittedPhase2 ? (
                  <div className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>Phase 2 submitted attempt {latestSubmittedPhase2.attempt_no}</strong>
                      <StatusBadge status={latestSubmittedPhase2.status} />
                    </div>
                    <Textarea
                      label="Phase 2 feedback"
                      labelPlacement="outside"
                      value={phase2Feedback}
                      onValueChange={setPhase2Feedback}
                      placeholder="Feedback used for retry/reject"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="success"
                        isLoading={busyAction === "phase2-accept"}
                        onPress={() =>
                          runAction("phase2-accept", async () => {
                            await apiPost("/api/admin/phase2/review", {
                              action: "accept",
                              task_id: data.phase2_task?.task_id,
                              submission_id: latestSubmittedPhase2.id,
                              feedback: phase2Feedback || null,
                            });
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        color="warning"
                        variant="flat"
                        isLoading={busyAction === "phase2-retry"}
                        onPress={() =>
                          runAction("phase2-retry", async () => {
                            await apiPost("/api/admin/phase2/review", {
                              action: "retry",
                              task_id: data.phase2_task?.task_id,
                              submission_id: latestSubmittedPhase2.id,
                              feedback: phase2Feedback || null,
                            });
                          })
                        }
                      >
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={busyAction === "phase2-reject"}
                        onPress={() =>
                          runAction("phase2-reject", async () => {
                            await apiPost("/api/admin/phase2/review", {
                              action: "reject",
                              task_id: data.phase2_task?.task_id,
                              submission_id: latestSubmittedPhase2.id,
                              feedback: phase2Feedback || null,
                            });
                          })
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p>No submitted Phase 2 action.</p>
                )}
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Phase 1 attempts</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {data.phase1_attempts?.length ? (
                  <div className="tfh-mobile-list">
                    {data.phase1_attempts.map((row) => (
                      <article key={row.submission_id} className="tfh-mobile-item">
                        <div className="tfh-mobile-item-top">
                          <strong>Attempt {row.attempt_no}</strong>
                          <StatusBadge status={row.status} />
                        </div>
                        <p>Reason: {row.reject_reason || "-"}</p>
                        <p>Admin notes: {row.admin_notes || "-"}</p>
                        {row.video_blob_url && (
                          <Button as="a" href={row.video_blob_url} target="_blank" rel="noreferrer" size="sm" variant="bordered">
                            Open video
                          </Button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No Phase 1 attempts.</p>
                )}
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Phase 2 task & submissions</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {data.phase2_task ? (
                  <>
                    <p>
                      Task status: <StatusBadge status={data.phase2_task.task_status} />
                    </p>
                    <p>Sentence: {data.phase2_task.phase2_sentence}</p>
                    <p>
                      Attempts: {data.phase2_task.current_attempts} / {data.phase2_task.attempts_allowed}
                    </p>
                  </>
                ) : (
                  <p>No Phase 2 task yet.</p>
                )}

                {data.phase2_submissions?.length ? (
                  <div className="tfh-mobile-list">
                    {data.phase2_submissions.map((row) => (
                      <article key={row.id} className="tfh-mobile-item">
                        <div className="tfh-mobile-item-top">
                          <strong>Attempt {row.attempt_no}</strong>
                          <StatusBadge status={row.status} />
                        </div>
                        <p>Feedback: {row.feedback || "-"}</p>
                        {row.video_blob_url && (
                          <Button as="a" href={row.video_blob_url} target="_blank" rel="noreferrer" size="sm" variant="bordered">
                            Open video
                          </Button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>No Phase 2 submissions.</p>
                )}
              </CardBody>
            </Card>
          </div>
        ) : (
          <p>No data.</p>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default AdminCandidateDetailPage;
