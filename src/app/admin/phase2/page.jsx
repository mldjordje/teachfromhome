"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";
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
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [info, setInfo] = useState("");
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

  useEffect(() => {
    setSelectedTaskIds((prev) => prev.filter((id) => rows.some((row) => row.task_id === id)));
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allTaskIds = rows.map((row) => row.task_id);
  const allSelected = allTaskIds.length > 0 && allTaskIds.every((id) => selectedTaskIds.includes(id));
  const selectedRows = rows.filter((row) => selectedTaskIds.includes(row.task_id));
  const selectedReviewRows = selectedRows.filter(
    (row) => row.latest_submission_id && ["submitted", "retry", "assigned"].includes(row.task_status),
  );
  const selectedDeleteRows = selectedRows.filter(
    (row) =>
      row.latest_submission_id &&
      row.latest_video_blob_url &&
      (["accepted", "rejected"].includes(row.latest_submission_status) || ["accepted", "rejected"].includes(row.task_status)),
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTaskIds([]);
      return;
    }
    setSelectedTaskIds(allTaskIds);
  };

  const toggleSelected = (taskId) => {
    setSelectedTaskIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]));
  };

  const reviewAction = async (row, action) => {
    if (!row.latest_submission_id) {
      setError("Za ovaj zadatak nema poslatog klipa.");
      return;
    }

    setBusyTaskId(row.task_id);
    setError("");
    setInfo("");

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
    setInfo("");

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

  const runBulk = async (rowsToProcess, fn, label) => {
    if (!rowsToProcess.length) {
      setError("Nema izabranih stavki za ovu bulk akciju.");
      return;
    }

    setBulkBusy(true);
    setError("");
    setInfo("");

    let okCount = 0;
    let failedCount = 0;
    let lastError = "";

    for (const row of rowsToProcess) {
      try {
        // Sequential updates keep task/submission state transitions consistent.
        // eslint-disable-next-line no-await-in-loop
        await fn(row);
        okCount += 1;
      } catch (err) {
        failedCount += 1;
        lastError = err?.message || "Nepoznata greška.";
      }
    }

    await loadRows();
    setSelectedTaskIds([]);
    setBulkBusy(false);

    if (failedCount) {
      setError(`${label}: uspešno ${okCount}, neuspešno ${failedCount}. ${lastError}`);
      return;
    }

    setInfo(`${label}: obrađeno ${okCount} stavki.`);
  };

  const bulkReview = async (action) => {
    await runBulk(
      selectedReviewRows,
      (row) =>
        apiPost("/api/admin/phase2/review", {
          action,
          task_id: row.task_id,
          submission_id: row.latest_submission_id,
          feedback: bulkFeedback || null,
        }),
      `Bulk ${action}`,
    );
  };

  const bulkDelete = async () => {
    if (!window.confirm("Obriši izabrane finalne Phase 2 snimke?")) return;

    await runBulk(
      selectedDeleteRows,
      (row) =>
        apiDelete("/api/admin/phase2/submission", {
          task_id: row.task_id,
          submission_id: row.latest_submission_id,
        }),
      "Bulk brisanje",
    );
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin faza 2 queue" subtitle="Pregledaj poslednje prijave i odluci: prihvati, retry ili odbij.">
        <AdminPhaseSwitch />

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
              <Button as={Link} href="/admin/accepted" variant="light" className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                Prihvaceni
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
        {info && <Alert color="success" title={info} className="mb-4" />}

        <Card className="tfh-admin-panel-card mb-4">
          <CardHeader>
            <h3 className="text-lg font-semibold">Bulk akcije</h3>
          </CardHeader>
          <Divider />
          <CardBody className="grid gap-3">
            <p className="tfh-admin-muted text-sm">
              Izabrano: {selectedRows.length} | Za review: {selectedReviewRows.length} | Za brisanje: {selectedDeleteRows.length}
            </p>

            <label className="tfh-admin-modern-field">
              <span className="tfh-admin-modern-label">Feedback za bulk review</span>
              <textarea
                className="tfh-admin-control"
                value={bulkFeedback}
                onChange={(event) => setBulkFeedback(event.target.value)}
                placeholder="Opcioni feedback za accept/retry/reject"
              />
            </label>

            <div className="tfh-admin-pagination-actions tfh-admin-bulk-actions">
              <Button
                size="sm"
                color="success"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--accept"
                isLoading={bulkBusy}
                onPress={() => bulkReview("accept")}
              >
                Bulk prihvati
              </Button>
              <Button
                size="sm"
                color="warning"
                variant="flat"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--retry"
                isLoading={bulkBusy}
                onPress={() => bulkReview("retry")}
              >
                Bulk retry
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--reject"
                isLoading={bulkBusy}
                onPress={() => bulkReview("reject")}
              >
                Bulk odbij
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="bordered"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--delete"
                isLoading={bulkBusy}
                onPress={bulkDelete}
              >
                Bulk obriši finalne snimke
              </Button>
            </div>
          </CardBody>
        </Card>

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
                <label className="tfh-admin-checkline tfh-bulk-select-line tfh-bulk-select-line--master">
                  <input className="tfh-bulk-select-input" type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  <span>Izaberi sve na stranici</span>
                </label>
                {rows.map((row) => (
                  <article key={row.task_id} className="tfh-mobile-item tfh-mobile-item--admin">
                    <label className="tfh-admin-checkline tfh-bulk-select-line">
                      <input
                        className="tfh-bulk-select-input"
                        type="checkbox"
                        checked={selectedTaskIds.includes(row.task_id)}
                        onChange={() => toggleSelected(row.task_id)}
                      />
                      <span>Izaberi za bulk</span>
                    </label>
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
                      <div className="tfh-admin-decision-stack">
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
                        <div className="tfh-admin-decision-row">
                          <Button
                            size="sm"
                            color="success"
                            className="tfh-admin-decision-btn tfh-admin-decision-btn--accept"
                            onPress={() => reviewAction(row, "accept")}
                            isLoading={busyTaskId === row.task_id}
                          >
                            Prihvati
                          </Button>
                          <Button
                            size="sm"
                            color="warning"
                            variant="flat"
                            className="tfh-admin-decision-btn tfh-admin-decision-btn--retry"
                            onPress={() => reviewAction(row, "retry")}
                            isLoading={busyTaskId === row.task_id}
                          >
                            Retry
                          </Button>
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="tfh-admin-decision-btn tfh-admin-decision-btn--reject"
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
                          className="tfh-admin-decision-btn tfh-admin-decision-btn--delete"
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
