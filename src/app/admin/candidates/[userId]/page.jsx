"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner, Textarea } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";
import StatusBadge from "@components/app/StatusBadge";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiDelete, apiGet, apiPost } from "@library/apiClient";

const AdminCandidateDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [rejectReason, setRejectReason] = useState("bad_pronunciation");
  const [rejectNotes, setRejectNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const payload = await apiGet(`/api/admin/candidates/${userId}`);
      setData(payload);
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

  const timeline = useMemo(() => {
    if (!data) return [];

    const items = [];

    for (const row of data.phase1_attempts || []) {
      items.push({
        id: `p1-submit-${row.submission_id}`,
        at: row.created_at,
        title: `Faza 1 pokusaj #${row.attempt_no} poslat`,
        detail: `Status: ${row.status}`,
      });

      if (row.reviewed_at) {
        items.push({
          id: `p1-review-${row.submission_id}`,
          at: row.reviewed_at,
          title: `Faza 1 pokusaj #${row.attempt_no} review`,
          detail: `Rezultat: ${row.status}${row.reject_reason ? ` (${row.reject_reason})` : ""}`,
        });
      }
    }

    return items
      .filter((item) => item.at)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
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

  const openPreview = (url, label) => {
    if (!url) return;
    setPreviewUrl(url);
    setPreviewTitle(label || "Pregled snimka");
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  const deletePhase1Video = async (row) => {
    if (!window.confirm(`Obrisi faza 1 glasovnu poruku za pokusaj ${row.attempt_no}?`)) return;
    await runAction("delete-phase1-video", async () => {
      await apiDelete("/api/admin/phase1/submission", {
        user_id: data.profile.user_id,
        submission_id: row.submission_id,
      });
    });
  };

  const deleteCandidateAccount = async () => {
    const fullName = `${data?.profile?.first_name || ""} ${data?.profile?.last_name || ""}`.trim();
    const confirmed = window.confirm(
      `Obrisi kandidata ${fullName || data?.profile?.email || userId} i sve povezane prijave? Ova akcija je trajna.`,
    );
    if (!confirmed) return;

    await runAction("delete-candidate", async () => {
      await apiDelete(`/api/admin/candidates/${userId}`);
      router.replace("/admin/candidates");
    });
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Detalj kandidata" subtitle="Pregled profila i odluka nakon faze 1.">
        <AdminPhaseSwitch />

        <div className="mb-3 flex flex-wrap gap-2">
          <Button as={Link} href="/admin/candidates" variant="bordered" className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
            Nazad na kandidate
          </Button>
          <Button
            color="danger"
            variant="flat"
            className="tfh-admin-decision-btn tfh-admin-decision-btn--delete"
            isLoading={busyAction === "delete-candidate"}
            onPress={deleteCandidateAccount}
          >
            Obrisi kandidata
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
                <h3 className="text-lg font-semibold">Timeline aktivnosti</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {timeline.length ? (
                  <div className="tfh-timeline-list">
                    {timeline.map((item) => (
                      <article key={item.id} className="tfh-timeline-item">
                        <strong>{item.title}</strong>
                        <p>{item.detail || "-"}</p>
                        <small>{new Date(item.at).toLocaleString()}</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Nema timeline dogadjaja.</p>
                )}
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
                    {pendingPhase1.video_blob_url && (
                      <Button
                        size="sm"
                        variant="bordered"
                        onPress={() => openPreview(pendingPhase1.video_blob_url, `Faza 1 pokusaj ${pendingPhase1.attempt_no}`)}
                      >
                        Preslusaj
                      </Button>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        color="primary"
                        isLoading={busyAction === "phase1-approve"}
                        onPress={() =>
                          runAction("phase1-approve", async () => {
                            await apiPost("/api/admin/phase1/move", {
                              user_id: data.profile.user_id,
                              submission_id: pendingPhase1.submission_id,
                            });
                          })
                        }
                      >
                        Oznaci kao prosao/la
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
                          <div className="tfh-admin-pagination-actions">
                            <Button
                              size="sm"
                              variant="bordered"
                              onPress={() => openPreview(row.video_blob_url, `Faza 1 pokusaj ${row.attempt_no}`)}
                            >
                              Preslusaj
                            </Button>
                            {["rejected", "moved_to_phase2"].includes(row.status) && (
                              <Button
                                size="sm"
                                color="danger"
                                variant="flat"
                                className="tfh-action-grid-btn tfh-action-grid-btn--ghost"
                                isLoading={busyAction === "delete-phase1-video"}
                                onPress={() => deletePhase1Video(row)}
                              >
                                Obrisi snimak
                              </Button>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Nema pokusaja za fazu 1.</p>
                )}
              </CardBody>
            </Card>
          </div>
        ) : (
          <p>Nema podataka.</p>
        )}
        <VideoPreviewModal open={Boolean(previewUrl)} src={previewUrl} title={previewTitle} onClose={closePreview} />
      </AppShell>
    </RequireAuth>
  );
};

export default AdminCandidateDetailPage;
