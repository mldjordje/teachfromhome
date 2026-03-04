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
      setError(loadError.message || "Neuspesno ucitavanje detalja kandidata.");
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
      setActionMessage("Akcija je uspesno zavrsena.");
      await loadData();
    } catch (actionError) {
      setError(actionError.message || "Akcija nije uspela.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Detalj kandidata" subtitle="Timeline prikaz kandidata za fazu 1 i fazu 2.">
        <div className="mb-3">
          <Button as={Link} href="/admin/candidates" variant="bordered" className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
            Nazad na kandidate
          </Button>
        </div>

        {error && <Alert color="danger" title={error} className="mb-4" />}
        {actionMessage && <Alert color="success" title={actionMessage} className="mb-4" />}

        {loading ? (
          <Card className="tfh-admin-panel-card">
            <CardBody className="flex items-center gap-3 py-6">
              <Spinner size="sm" />
              <p>Ucitavanje kandidata...</p>
            </CardBody>
          </Card>
        ) : data ? (
          <div className="grid gap-4">
            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Profil</h3>
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
                <p>Trenutna faza: {data.profile.current_phase}</p>
                <p>Kratko o kandidatu: {data.profile.short_about || "-"}</p>
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Review akcije</h3>
              </CardHeader>
              <Divider />
              <CardBody className="grid gap-4">
                {pendingPhase1 ? (
                  <div className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>Faza 1 pokusaj na cekanju {pendingPhase1.attempt_no}</strong>
                      <StatusBadge status={pendingPhase1.status} />
                    </div>
                    <Textarea
                      label="Recenica za fazu 2"
                      labelPlacement="outside"
                      value={phase2Sentence}
                      onValueChange={setPhase2Sentence}
                      placeholder="Recenica za faza 2 zadatak"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={busyAction === "phase1-move"}
                        onPress={() =>
                          runAction("phase1-move", async () => {
                            if (!phase2Sentence.trim()) {
                              throw new Error("Recenica za fazu 2 je obavezna.");
                            }
                            await apiPost("/api/admin/phase1/move", {
                              user_id: data.profile.user_id,
                              submission_id: pendingPhase1.submission_id,
                              phase2_sentence: phase2Sentence.trim(),
                            });
                          })
                        }
                      >
                        Prebaci u fazu 2
                      </Button>
                    </div>

                    <div className="grid gap-2">
                      <select
                        className="tfh-admin-inline-select"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      >
                        <option value="bad_accent">bad_accent</option>
                        <option value="bad_pronunciation">bad_pronunciation</option>
                        <option value="low_energy">low_energy</option>
                      </select>
                      <Textarea
                        label="Napomena za odbijanje"
                        labelPlacement="outside"
                        value={rejectNotes}
                        onValueChange={setRejectNotes}
                        placeholder="Opciona napomena"
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
                        Odbij fazu 1
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p>Nema pending akcije za fazu 1.</p>
                )}

                {latestSubmittedPhase2 ? (
                  <div className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>Faza 2 poslati pokusaj {latestSubmittedPhase2.attempt_no}</strong>
                      <StatusBadge status={latestSubmittedPhase2.status} />
                    </div>
                    <Textarea
                      label="Feedback za fazu 2"
                      labelPlacement="outside"
                      value={phase2Feedback}
                      onValueChange={setPhase2Feedback}
                      placeholder="Feedback za retry/reject"
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
                        Prihvati
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
                        Odbij
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p>Nema submitted akcije za fazu 2.</p>
                )}
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Pokusaji faze 1</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {data.phase1_attempts?.length ? (
                  <div className="tfh-mobile-list">
                    {data.phase1_attempts.map((row) => (
                      <article key={row.submission_id} className="tfh-mobile-item">
                        <div className="tfh-mobile-item-top">
                          <strong>Pokusaj {row.attempt_no}</strong>
                          <StatusBadge status={row.status} />
                        </div>
                        <p>Razlog: {row.reject_reason || "-"}</p>
                        <p>Admin napomena: {row.admin_notes || "-"}</p>
                        {row.video_blob_url && (
                          <Button as="a" href={row.video_blob_url} target="_blank" rel="noreferrer" size="sm" variant="bordered">
                            Otvori video
                          </Button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Nema pokusaja za fazu 1.</p>
                )}
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Faza 2 zadatak i prijave</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {data.phase2_task ? (
                  <>
                    <p>
                      Status zadatka: <StatusBadge status={data.phase2_task.task_status} />
                    </p>
                    <p>Recenica: {data.phase2_task.phase2_sentence}</p>
                    <p>
                      Pokusaji: {data.phase2_task.current_attempts} / {data.phase2_task.attempts_allowed}
                    </p>
                  </>
                ) : (
                  <p>Zadatak za fazu 2 jos nije otvoren.</p>
                )}

                {data.phase2_submissions?.length ? (
                  <div className="tfh-mobile-list">
                    {data.phase2_submissions.map((row) => (
                      <article key={row.id} className="tfh-mobile-item">
                        <div className="tfh-mobile-item-top">
                          <strong>Pokusaj {row.attempt_no}</strong>
                          <StatusBadge status={row.status} />
                        </div>
                        <p>Feedback: {row.feedback || "-"}</p>
                        {row.video_blob_url && (
                          <Button as="a" href={row.video_blob_url} target="_blank" rel="noreferrer" size="sm" variant="bordered">
                            Otvori video
                          </Button>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Nema prijava za fazu 2.</p>
                )}
              </CardBody>
            </Card>
          </div>
        ) : (
          <p>Nema podataka.</p>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default AdminCandidateDetailPage;
