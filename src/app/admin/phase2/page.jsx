"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiDelete, apiGet, apiPost } from "@library/apiClient";

const AdminPhase2Page = () => {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");
  const [busyDeleteId, setBusyDeleteId] = useState("");
  const [feedbackMap, setFeedbackMap] = useState({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const loadRows = async () => {
    setLoading(true);

    try {
      const payload = await apiGet(
        `/api/admin/phase2?status=${encodeURIComponent(statusFilter)}&page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
          String(pageSize),
        )}`,
      );
      setError("");
      setRows(payload.rows || []);
      setTotal(Number(payload.total || 0));
    } catch (loadError) {
      setError(loadError.message || "Neuspesno ucitavanje faza 2 queue-a.");
      setRows([]);
      setTotal(0);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [statusFilter, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const reviewAction = async (row, action) => {
    if (!row.latest_submission_id) {
      setError("Za ovaj zadatak nema poslatog klipa.");
      return;
    }

    setBusyTaskId(row.task_id);
    setError("");

    try {
      await apiPost("/api/admin/phase2/review", {
        action,
        task_id: row.task_id,
        submission_id: row.latest_submission_id,
        feedback: feedbackMap[row.task_id] || null,
      });

      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Review akcija nije uspela.");
    }

    setBusyTaskId("");
  };

  const openPreview = (row) => {
    setPreviewUrl(row.latest_video_blob_url || "");
    setPreviewTitle(`${row.first_name || "Kandidat"} ${row.last_name || ""} - Faza 2 pokusaj ${row.latest_attempt_no || "-"}`.trim());
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  const deletePhase2Video = async (row) => {
    if (!row?.latest_submission_id) return;

    const confirmed = window.confirm("Obrisi poslednji Phase 2 video i ukloni ga iz aktivne liste?");
    if (!confirmed) return;

    setBusyDeleteId(row.latest_submission_id);
    setError("");

    try {
      await apiDelete("/api/admin/phase2/submission", {
        task_id: row.task_id,
        submission_id: row.latest_submission_id,
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Brisanje Phase 2 videa nije uspelo.");
    } finally {
      setBusyDeleteId("");
    }
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin faza 2 queue" subtitle="Pregledaj poslednje prijave i odluci: prihvati, retry ili odbij.">
        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="tfh-admin-toolbar">
            <div className="tfh-admin-toolbar-left">
              <select
                className="tfh-admin-filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">Svi statusi</option>
                <option value="assigned">Dodeljeno</option>
                <option value="submitted">Poslato</option>
                <option value="retry">Retry</option>
                <option value="accepted">Prihvaceno</option>
                <option value="rejected">Odbijeno</option>
              </select>
              <select
                className="tfh-admin-filter-select"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) || 20);
                  setPage(1);
                }}
              >
                <option value="20">20 po strani</option>
                <option value="50">50 po strani</option>
                <option value="100">100 po strani</option>
              </select>
            </div>
            <div className="tfh-admin-toolbar-right">
              <Button variant="bordered" onPress={loadRows} className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                Osvezi
              </Button>
              <Button as={Link} href="/admin/candidates" variant="light" className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                Pregled kandidata
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="tfh-admin-pagination">
            <div className="tfh-admin-muted text-sm">
              Strana {page} od {totalPages} ({total} ukupno)
            </div>
            <div className="tfh-admin-pagination-actions">
              <Button
                size="sm"
                variant="bordered"
                isDisabled={loading || page <= 1}
                onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Prethodna
              </Button>
              <Button
                size="sm"
                variant="bordered"
                isDisabled={loading || page >= totalPages}
                onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Sledeca
              </Button>
            </div>
          </CardBody>
        </Card>

        {error && <Alert color="danger" title={error} className="mb-4" />}

        <Card className="tfh-admin-panel-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Faza 2 queue</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Ucitavanje faza 2 queue-a...</p>
              </div>
            ) : rows.length ? (
              <div className="tfh-mobile-list">
                {rows.map((row) => (
                  <article key={row.task_id} className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>
                        {row.first_name} {row.last_name}
                      </strong>
                      <StatusBadge status={row.task_status} />
                    </div>
                    <p>{row.email}</p>
                    <p>
                      Pokusaji: {row.current_attempts} / {row.attempts_allowed}
                    </p>
                    <p>Recenica: {row.phase2_sentence}</p>
                    {row.last_feedback && <p>Feedback: {row.last_feedback}</p>}

                    {row.latest_submission_id ? (
                      <>
                        <p>Poslednji pokusaj: {row.latest_attempt_no}</p>
                        <p>
                          Poslednji status: <StatusBadge status={row.latest_submission_status} />
                        </p>
                        <p>{row.latest_submission_feedback || "-"}</p>
                      </>
                    ) : (
                      <p>Jos nema prijave</p>
                    )}

                    {row.latest_video_blob_url && (
                      <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>Pregled videa</Button>
                    )}

                    {row.latest_submission_id && ["submitted", "retry", "assigned"].includes(row.task_status) && (
                      <div className="flex flex-col gap-2">
                        <label className="tfh-admin-modern-field">
                          <span className="tfh-admin-modern-label">Feedback</span>
                          <textarea
                            className="tfh-admin-control"
                            placeholder="Feedback za retry/reject"
                            value={feedbackMap[row.task_id] || ""}
                            onChange={(event) =>
                              setFeedbackMap((prev) => ({
                                ...prev,
                                [row.task_id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" color="success" onPress={() => reviewAction(row, "accept")} isLoading={busyTaskId === row.task_id}>
                            Prihvati
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
                            Odbij
                          </Button>
                        </div>
                      </div>
                    )}

                    {row.latest_submission_id &&
                      row.latest_video_blob_url &&
                      (["accepted", "rejected"].includes(row.latest_submission_status) ||
                        ["accepted", "rejected"].includes(row.task_status)) && (
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          className="tfh-action-grid-btn tfh-action-grid-btn--ghost"
                          isLoading={busyDeleteId === row.latest_submission_id}
                          onPress={() => deletePhase2Video(row)}
                        >
                          Obrisi video
                        </Button>
                      )}
                  </article>
                ))}
              </div>
            ) : (
              <p>Nema zapisa.</p>
            )}
          </CardBody>
        </Card>
        <VideoPreviewModal open={Boolean(previewUrl)} src={previewUrl} title={previewTitle} onClose={closePreview} />
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase2Page;
