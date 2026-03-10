"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import { useAuth } from "@components/auth/AuthProvider";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";
import StatusBadge from "@components/app/StatusBadge";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiDelete, apiGet, apiPost } from "@library/apiClient";

const AdminPhase1Page = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [busyDeleteId, setBusyDeleteId] = useState("");
  const [phase2Sentences, setPhase2Sentences] = useState({});
  const [rejectReasons, setRejectReasons] = useState({});
  const [rejectNotes, setRejectNotes] = useState({});
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState([]);
  const [bulkSentence, setBulkSentence] = useState("");
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
          // Mobile clients occasionally get an empty first read while count is already updated.
          // A short retry window avoids requiring manual "Osvezi".
          // eslint-disable-next-line no-await-in-loop
          await sleep(delayMs);
          // eslint-disable-next-line no-await-in-loop
          ({ rows: nextRows, total: nextTotal } = await fetchQueue(targetPage));
          lastValidPage = Math.max(1, Math.ceil(nextTotal / pageSize));
          if (targetPage > lastValidPage) {
            targetPage = lastValidPage;
            if (targetPage !== page) {
              setPage(targetPage);
            }
            // eslint-disable-next-line no-await-in-loop
            ({ rows: nextRows, total: nextTotal } = await fetchQueue(targetPage));
          }
          if (nextTotal === 0 || nextRows.length > 0) break;
        }
      }

      if (loadToken !== loadTokenRef.current) {
        return;
      }

      setRows(nextRows);
      setTotal(nextTotal);
      setError("");
    } catch (loadError) {
      if (loadToken !== loadTokenRef.current) {
        return;
      }
      setError(loadError.message || "Neuspesno ucitavanje Faza 1 queue.");
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
  }, [authLoading, isAdmin, page, pageSize, statusFilter, user?.id]);

  useEffect(() => {
    setSelectedSubmissionIds((prev) => prev.filter((id) => rows.some((row) => row.submission_id === id)));
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queueInfo = useMemo(() => {
    if (!rows.length) {
      if (statusFilter === "pending") return "Nema kandidata na čekanju. Promeni filter ili osveži listu.";
      return "Nema zapisa za izabrani filter.";
    }
    return "";
  }, [rows.length, statusFilter]);

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

  const moveToPhase2 = async (row) => {
    const sentence = phase2Sentences[row.submission_id]?.trim();
    if (!sentence) {
      setError("Rečenica za Fazu 2 je obavezna.");
      return;
    }

    setBusyId(row.submission_id);
    setError("");
    setInfo("");

    try {
      await apiPost("/api/admin/phase1/move", {
        user_id: row.user_id,
        submission_id: row.submission_id,
        phase2_sentence: sentence,
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Prebacivanje u Fazu 2 nije uspelo.");
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
    setPreviewTitle(`${row.first_name || "Kandidat"} ${row.last_name || ""} - Faza 1 pokušaj ${row.attempt_no}`.trim());
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  const deletePhase1Video = async (row) => {
    if (!row?.submission_id) return;

    const confirmed = window.confirm("Obriši ovu Faza 1 glasovnu poruku i ukloni je iz aktivne liste?");
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
      setError(actionError.message || "Brisanje Faza 1 glasovne poruke nije uspelo.");
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
        // Sequential processing avoids race conflicts on same candidate updates.
        // eslint-disable-next-line no-await-in-loop
        await fn(row);
        okCount += 1;
      } catch (err) {
        failedCount += 1;
        lastError = err?.message || "Nepoznata greška.";
      }
    }

    await loadRows();
    setSelectedSubmissionIds([]);
    setBulkBusy(false);

    if (failedCount) {
      setError(`${successLabel}: uspešno ${okCount}, neuspešno ${failedCount}. ${lastError}`);
      return;
    }

    setInfo(`${successLabel}: obrađeno ${okCount} stavki.`);
  };

  const bulkMoveToPhase2 = async () => {
    const sentence = bulkSentence.trim();
    if (!sentence) {
      setError("Unesite rečenicu za bulk prebacivanje u Fazu 2.");
      return;
    }

    await runBulk(
      selectedPendingRows,
      (row) =>
        apiPost("/api/admin/phase1/move", {
          user_id: row.user_id,
          submission_id: row.submission_id,
          phase2_sentence: sentence,
        }),
      "Bulk prebacivanje u Fazu 2",
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
    if (!window.confirm("Obriši izabrane Faza 1 snimke koji su već review-ovani?")) return;

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
      <label className="tfh-admin-modern-field">
        <span className="tfh-admin-modern-label">Rečenica za Fazu 2</span>
        <textarea
          className="tfh-admin-control"
          value={phase2Sentences[row.submission_id] || ""}
          onChange={(event) =>
            setPhase2Sentences((prev) => ({
              ...prev,
              [row.submission_id]: event.target.value,
            }))
          }
        />
      </label>
      <Button
        size="sm"
        color="primary"
        className="tfh-admin-decision-btn tfh-admin-decision-btn--move"
        onPress={() => moveToPhase2(row)}
        isLoading={busyId === row.submission_id}
      >
        Prebaci u Fazu 2
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
      <AppShell title="Admin Faza 1 queue" subtitle="Pregledaj prijave, odbij ili prebaci kandidata u Fazu 2.">
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
                <option value="pending">Na čekanju</option>
                <option value="rejected">Odbijeni</option>
                <option value="moved_to_phase2">Prebačeni u Fazu 2</option>
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
                Osveži
              </Button>
              <Button as={Link} href="/admin/candidates" variant="light" className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                Pregled kandidata
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="tfh-admin-pagination">
            <div className="tfh-admin-muted text-sm">Strana {page} od {totalPages} ({total} ukupno)</div>
            <div className="tfh-admin-pagination-actions">
              <Button size="sm" variant="bordered" isDisabled={loading || page <= 1} onPress={() => setPage((prev) => Math.max(1, prev - 1))}>
                Prethodna
              </Button>
              <Button size="sm" variant="bordered" isDisabled={loading || page >= totalPages} onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                Sledeća
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
              Izabrano: {selectedRows.length} | Pending: {selectedPendingRows.length} | Za brisanje: {selectedDeletableRows.length}
            </p>

            <label className="tfh-admin-modern-field">
              <span className="tfh-admin-modern-label">Rečenica za bulk move u Fazu 2</span>
              <textarea
                className="tfh-admin-control"
                value={bulkSentence}
                onChange={(event) => setBulkSentence(event.target.value)}
                placeholder="Jedna rečenica za sve izabrane pending kandidate"
              />
            </label>
            <div className="tfh-admin-pagination-actions tfh-admin-bulk-actions">
              <Button
                size="sm"
                color="primary"
                className="tfh-admin-decision-btn tfh-admin-decision-btn--move"
                isLoading={bulkBusy}
                onPress={bulkMoveToPhase2}
              >
                Bulk prebaci u Fazu 2
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
                Bulk obriši review-ovane snimke
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Lista prijava za Fazu 1</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Ucitavanje Faza 1 queue...</p>
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
                        <th>Pokušaj</th>
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
                                Preslušaj
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
                                      Obriši snimak
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
                      <p>Pokušaj: {row.attempt_no}</p>

                      {row.video_blob_url && (
                        <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>Preslušaj</Button>
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
                            Obriši snimak
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
        <VideoPreviewModal open={Boolean(previewUrl)} src={previewUrl} title={previewTitle} onClose={closePreview} />
      </AppShell>
    </RequireAuth>
  );
};

export default AdminPhase1Page;


