"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import { useAuth } from "@components/auth/AuthProvider";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";
import StatusBadge from "@components/app/StatusBadge";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiDelete, apiGet, apiPost } from "@library/apiClient";

const AdminPhase1Page = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const statusFilter = "pending";
  const pageSize = 20;
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [busyDeleteId, setBusyDeleteId] = useState("");
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectNotes, setRejectNotes] = useState({});
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState([]);
  const [bulkRejectReason, setBulkRejectReason] = useState("bad_pronunciation");
  const [bulkRejectNotes, setBulkRejectNotes] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const loadTokenRef = useRef(0);

  const loadRows = async () => {
    const loadToken = ++loadTokenRef.current;
    const buildQueueUrl = (targetPage) =>
      `/api/admin/phase1?status=${encodeURIComponent(statusFilter)}&page=${encodeURIComponent(String(targetPage))}&pageSize=${encodeURIComponent(
        String(pageSize),
      )}`;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    setLoading(true);
    try {
      const fetchQueue = async (targetPage) => {
        const payload = await apiGet(buildQueueUrl(targetPage));
        return {
          rows: payload.rows || [],
          total: Number(payload.total || 0),
        };
      };

      let targetPage = page;
      let { rows: nextRows, total: nextTotal } = await fetchQueue(targetPage);
      let lastValidPage = Math.max(1, Math.ceil(nextTotal / pageSize));

      if (targetPage > lastValidPage) {
        targetPage = lastValidPage;
        ({ rows: nextRows, total: nextTotal } = await fetchQueue(targetPage));
        if (targetPage !== page) {
          setPage(targetPage);
        }
      }

      if (nextTotal > 0 && nextRows.length === 0) {
        for (const delayMs of [300, 700, 1200]) {
          await sleep(delayMs);
          ({ rows: nextRows, total: nextTotal } = await fetchQueue(targetPage));
          lastValidPage = Math.max(1, Math.ceil(nextTotal / pageSize));
          if (targetPage > lastValidPage) {
            targetPage = lastValidPage;
            if (targetPage !== page) {
              setPage(targetPage);
            }
            ({ rows: nextRows, total: nextTotal } = await fetchQueue(targetPage));
          }
          if (nextTotal === 0 || nextRows.length > 0) break;
        }
      }

      if (loadToken !== loadTokenRef.current) return;

      setRows(nextRows);
      setTotal(nextTotal);
      setError("");
    } catch (loadError) {
      if (loadToken !== loadTokenRef.current) return;
      setError(loadError.message || "Neuspesno ucitavanje faza 1 queue.");
      setRows([]);
      setTotal(0);
    } finally {
      if (loadToken === loadTokenRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) return;
    loadRows();
  }, [authLoading, isAdmin, page, user?.id]);

  useEffect(() => {
    setSelectedSubmissionIds((prev) => prev.filter((id) => rows.some((row) => row.submission_id === id)));
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queueInfo = useMemo(() => {
    if (!rows.length) {
      return "Nema kandidata na cekanju.";
    }
    return "";
  }, [rows.length]);

  const allIds = rows.map((row) => row.submission_id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSubmissionIds.includes(id));
  const selectedRows = rows.filter((row) => selectedSubmissionIds.includes(row.submission_id));
  const selectedPendingRows = selectedRows.filter((row) => row.status === "pending");
  const selectedDeletableRows = selectedRows.filter(
    (row) => row.video_blob_url && ["rejected", "moved_to_phase2"].includes(row.status),
  );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSubmissionIds([]);
      return;
    }
    setSelectedSubmissionIds(allIds);
  };

  const toggleSelected = (submissionId) => {
    setSelectedSubmissionIds((prev) =>
      prev.includes(submissionId) ? prev.filter((id) => id !== submissionId) : [...prev, submissionId],
    );
  };

  const approvePhase1 = async (row) => {
    setBusyId(row.submission_id);
    setError("");
    setInfo("");

    try {
      await apiPost("/api/admin/phase1/move", {
        user_id: row.user_id,
        submission_id: row.submission_id,
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Potvrda prolaska faze 1 nije uspela.");
    }

    setBusyId("");
  };

  const rejectPhase1 = async (row) => {
    const reason = rejectReasons[row.submission_id] || "bad_pronunciation";
    const notes = rejectNotes[row.submission_id] || "";

    setBusyId(row.submission_id);
    setError("");
    setInfo("");

    try {
      await apiPost("/api/admin/phase1/reject", {
        user_id: row.user_id,
        submission_id: row.submission_id,
        reason,
        notes,
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Odbijanje nije uspelo.");
    }

    setBusyId("");
  };

  const openPreview = (row) => {
    setPreviewUrl(row.video_blob_url || "");
    setPreviewTitle(`${row.first_name || "Kandidat"} ${row.last_name || ""} - faza 1 pokusaj ${row.attempt_no}`.trim());
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  const deletePhase1Video = async (row) => {
    if (!row?.submission_id) return;
    const confirmed = window.confirm("Obrisi ovu faza 1 glasovnu poruku i ukloni je iz aktivne liste?");
    if (!confirmed) return;

    setBusyDeleteId(row.submission_id);
    setError("");
    setInfo("");

    try {
      await apiDelete("/api/admin/phase1/submission", {
        user_id: row.user_id,
        submission_id: row.submission_id,
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Brisanje faza 1 glasovne poruke nije uspelo.");
    } finally {
      setBusyDeleteId("");
    }
  };

  const runBulk = async (rowsToProcess, fn, successLabel) => {
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
        await fn(row);
        okCount += 1;
      } catch (err) {
        failedCount += 1;
        lastError = err?.message || "Nepoznata greska.";
      }
    }

    await loadRows();
    setSelectedSubmissionIds([]);
    setBulkBusy(false);

    if (failedCount) {
      setError(`${successLabel}: uspesno ${okCount}, neuspesno ${failedCount}. ${lastError}`);
      return;
    }

    setInfo(`${successLabel}: obradjeno ${okCount} stavki.`);
  };

  const bulkApprovePhase1 = async () => {
    await runBulk(
      selectedPendingRows,
      (row) =>
        apiPost("/api/admin/phase1/move", {
          user_id: row.user_id,
          submission_id: row.submission_id,
        }),
      "Bulk potvrda prolaska faze 1",
    );
  };

  const bulkReject = async () => {
    await runBulk(
      selectedPendingRows,
      (row) =>
        apiPost("/api/admin/phase1/reject", {
          user_id: row.user_id,
          submission_id: row.submission_id,
          reason: bulkRejectReason,
          notes: bulkRejectNotes || "",
        }),
      "Bulk odbijanje",
    );
  };

  const bulkDelete = async () => {
    if (!window.confirm("Obrisi izabrane faza 1 snimke koji su vec review-ovani?")) return;

    await runBulk(
      selectedDeletableRows,
      (row) =>
        apiDelete("/api/admin/phase1/submission", {
          user_id: row.user_id,
          submission_id: row.submission_id,
        }),
      "Bulk brisanje snimaka",
    );
  };

  const renderActionPanel = (row) => (
    <div className="tfh-admin-decision-stack">
      <Button
        size="sm"
        color="primary"
        className="tfh-admin-decision-btn tfh-admin-decision-btn--move"
        onPress={() => approvePhase1(row)}
        isLoading={busyId === row.submission_id}
      >
        Oznaci kao prosao/la
      </Button>

      <select
        className="tfh-admin-inline-select tfh-admin-inline-select--bold"
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

      <label className="tfh-admin-modern-field">
        <span className="tfh-admin-modern-label">Napomena za odbijanje</span>
        <textarea
          className="tfh-admin-control"
          value={rejectNotes[row.submission_id] || ""}
          onChange={(event) =>
            setRejectNotes((prev) => ({
              ...prev,
              [row.submission_id]: event.target.value,
            }))
          }
        />
      </label>

      <Button
        size="sm"
        color="danger"
        variant="flat"
        className="tfh-admin-decision-btn tfh-admin-decision-btn--reject"
        onPress={() => rejectPhase1(row)}
        isLoading={busyId === row.submission_id}
      >
        Odbij
      </Button>
    </div>
  );

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin faza 1 queue" subtitle="Pregledaj prijave, odbij ili potvrdi da kandidat prolazi fazu 1 i ide na HR kontakt.">
        <AdminPhaseSwitch />

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="tfh-admin-pagination">
            <div className="tfh-admin-muted text-sm">Strana {page} od {totalPages} ({total} ukupno)</div>
            <div className="tfh-admin-pagination-actions">
              <Button size="sm" variant="bordered" isDisabled={loading || page <= 1} onPress={() => setPage((prev) => Math.max(1, prev - 1))}>
                Prethodna
              </Button>
              <Button size="sm" variant="bordered" isDisabled={loading || page >= totalPages} onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                Sledeca
              </Button>
            </div>
          </CardBody>
        </Card>

        {error && <Alert color="danger" title={error} className="mb-4" />}
        {info && <Alert color="success" title={info} className="mb-4" />}

        <Card className="tfh-admin-panel-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Lista prijava za fazu 1</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Ucitavanje faza 1 queue...</p>
              </div>
            ) : rows.length ? (
              <>
                <label className="tfh-admin-checkline tfh-bulk-select-line tfh-bulk-select-line--master mb-2">
                  <input className="tfh-bulk-select-input" type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  <span>Izaberi sve na stranici</span>
                </label>

                <div className="tfh-table-wrap hidden lg:block">
                  <table className="tfh-table">
                    <thead>
                      <tr>
                        <th>
                          <input className="tfh-bulk-select-input" type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                        </th>
                        <th>Kandidat</th>
                        <th>Status</th>
                        <th>Pokusaj</th>
                        <th>Snimak</th>
                        <th>Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.submission_id}>
                          <td>
                            <input
                              className="tfh-bulk-select-input"
                              type="checkbox"
                              checked={selectedSubmissionIds.includes(row.submission_id)}
                              onChange={() => toggleSelected(row.submission_id)}
                            />
                          </td>
                          <td>
                            <strong>{row.first_name} {row.last_name}</strong>
                            <div>{row.email}</div>
                            <div>{row.phone || "-"}</div>
                          </td>
                          <td><StatusBadge status={row.status} /></td>
                          <td>{row.attempt_no}</td>
                          <td>
                            {row.video_blob_url ? (
                              <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>
                                Preslusaj
                              </Button>
                            ) : "-"}
                          </td>
                          <td>
                            <div className="flex flex-col gap-2">
                              {row.status === "pending" ? (
                                renderActionPanel(row)
                              ) : (
                                <>
                                  <span className="tfh-admin-muted text-sm">Review je zavrsen.</span>
                                  {row.video_blob_url && (
                                    <Button
                                      size="sm"
                                      color="danger"
                                      variant="flat"
                                      className="tfh-admin-decision-btn tfh-admin-decision-btn--delete"
                                      isLoading={busyDeleteId === row.submission_id}
                                      onPress={() => deletePhase1Video(row)}
                                    >
                                      Obrisi snimak
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="tfh-mobile-list lg:hidden">
                  {rows.map((row) => (
                    <article key={row.submission_id} className="tfh-mobile-item tfh-mobile-item--admin">
                      <label className="tfh-admin-checkline tfh-bulk-select-line">
                        <input
                          className="tfh-bulk-select-input"
                          type="checkbox"
                          checked={selectedSubmissionIds.includes(row.submission_id)}
                          onChange={() => toggleSelected(row.submission_id)}
                        />
                        <span>Izaberi za bulk</span>
                      </label>
                      <div className="tfh-mobile-item-top">
                        <strong>{row.first_name} {row.last_name}</strong>
                        <StatusBadge status={row.status} />
                      </div>
                      <p>{row.email}</p>
                      <p>{row.phone || "-"}</p>
                      <p>Pokusaj: {row.attempt_no}</p>

                      {row.video_blob_url && (
                        <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>Preslusaj</Button>
                      )}

                      {row.status === "pending" ? (
                        renderActionPanel(row)
                      ) : (
                        row.video_blob_url && (
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="tfh-admin-decision-btn tfh-admin-decision-btn--delete"
                            isLoading={busyDeleteId === row.submission_id}
                            onPress={() => deletePhase1Video(row)}
                          >
                            Obrisi snimak
                          </Button>
                        )
                      )}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p>{queueInfo}</p>
            )}
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardHeader>
            <h3 className="text-lg font-semibold">Bulk akcije</h3>
          </CardHeader>
          <Divider />
          <CardBody className="grid gap-3">
            <p className="tfh-admin-muted text-sm">
              Izabrano: {selectedRows.length} | Pending: {selectedPendingRows.length} | Za brisanje: {selectedDeletableRows.length}
            </p>

            <div className="tfh-admin-pagination-actions tfh-admin-bulk-actions">
              <Button
                size="sm"
                color="primary"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--move"
                isLoading={bulkBusy}
                onPress={bulkApprovePhase1}
              >
                Bulk oznaci kao prosli
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <select
                className="tfh-admin-inline-select tfh-admin-inline-select--bold"
                value={bulkRejectReason}
                onChange={(e) => setBulkRejectReason(e.target.value)}
              >
                <option value="bad_accent">bad_accent</option>
                <option value="bad_pronunciation">bad_pronunciation</option>
                <option value="low_energy">low_energy</option>
              </select>
              <input
                className="tfh-admin-control"
                value={bulkRejectNotes}
                onChange={(event) => setBulkRejectNotes(event.target.value)}
                placeholder="Napomena za bulk odbijanje (opciono)"
              />
            </div>

            <div className="tfh-admin-pagination-actions tfh-admin-bulk-actions">
              <Button
                size="sm"
                color="danger"
                variant="flat"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--reject"
                isLoading={bulkBusy}
                onPress={bulkReject}
              >
                Bulk odbij pending
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="bordered"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--delete"
                isLoading={bulkBusy}
                onPress={bulkDelete}
              >
                Bulk obrisi review-ovane snimke
              </Button>
            </div>
          </CardBody>
        </Card>

        <VideoPreviewModal open={Boolean(previewUrl)} src={previewUrl} title={previewTitle} onClose={closePreview} />
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase1Page;
