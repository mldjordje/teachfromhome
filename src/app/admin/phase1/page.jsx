"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiDelete, apiGet, apiPost } from "@library/apiClient";

const AdminPhase1Page = () => {
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
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const loadRows = async () => {
    setLoading(true);
    try {
      const payload = await apiGet(
        `/api/admin/phase1?status=${encodeURIComponent(statusFilter)}&page=${encodeURIComponent(String(page))}&pageSize=${encodeURIComponent(
          String(pageSize),
        )}`,
      );
      setRows(payload.rows || []);
      setTotal(Number(payload.total || 0));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Neuspesno ucitavanje Faza 1 queue.");
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [statusFilter, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const queueInfo = useMemo(() => {
    if (!rows.length) {
      if (statusFilter === "pending") return "Nema kandidata na cekanju. Promeni filter ili osvezi listu.";
      return "Nema zapisa za izabrani filter.";
    }
    return "";
  }, [rows.length, statusFilter]);

  const moveToPhase2 = async (row) => {
    const sentence = phase2Sentences[row.submission_id]?.trim();
    if (!sentence) {
      setError("Recenica za Fazu 2 je obavezna.");
      return;
    }

    setBusyId(row.submission_id);
    setError("");

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
    setPreviewTitle(`${row.first_name || "Kandidat"} ${row.last_name || ""} - Faza 1 pokusaj ${row.attempt_no}`.trim());
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  const deletePhase1Video = async (row) => {
    if (!row?.submission_id) return;

    const confirmed = window.confirm("Obrisi ovaj Phase 1 video i ukloni ga iz aktivne liste?");
    if (!confirmed) return;

    setBusyDeleteId(row.submission_id);
    setError("");

    try {
      await apiDelete("/api/admin/phase1/submission", {
        user_id: row.user_id,
        submission_id: row.submission_id,
      });
      await loadRows();
    } catch (actionError) {
      setError(actionError.message || "Brisanje Phase 1 videa nije uspelo.");
    } finally {
      setBusyDeleteId("");
    }
  };

  const ActionPanel = ({ row }) => (
    <div className="flex flex-col gap-2">
      <label className="tfh-admin-modern-field">
        <span className="tfh-admin-modern-label">Recenica za Fazu 2</span>
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
      <Button size="sm" color="primary" onPress={() => moveToPhase2(row)} isLoading={busyId === row.submission_id}>
        Prebaci u Fazu 2
      </Button>

      <select
        className="tfh-admin-inline-select"
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

      <Button size="sm" color="danger" variant="flat" onPress={() => rejectPhase1(row)} isLoading={busyId === row.submission_id}>
        Odbij
      </Button>
    </div>
  );

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Faza 1 queue" subtitle="Pregledaj prijave, odbij ili prebaci kandidata u Fazu 2.">
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
                <option value="pending">Na cekanju</option>
                <option value="rejected">Odbijeni</option>
                <option value="moved_to_phase2">Prebaceni u Fazu 2</option>
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
                <div className="tfh-table-wrap hidden lg:block">
                  <table className="tfh-table">
                    <thead>
                      <tr>
                        <th>Kandidat</th>
                        <th>Status</th>
                        <th>Pokusaj</th>
                        <th>Video</th>
                        <th>Akcije</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.submission_id}>
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
                                Pregled videa
                              </Button>
                            ) : "-"}
                          </td>
                          <td>
                            <div className="flex flex-col gap-2">
                              {row.status === "pending" ? (
                                <ActionPanel row={row} />
                              ) : (
                                <>
                                  <span className="tfh-admin-muted text-sm">Review je zavrsen.</span>
                                  {row.video_blob_url && (
                                    <Button
                                      size="sm"
                                      color="danger"
                                      variant="flat"
                                      className="tfh-action-grid-btn tfh-action-grid-btn--ghost"
                                      isLoading={busyDeleteId === row.submission_id}
                                      onPress={() => deletePhase1Video(row)}
                                    >
                                      Obrisi video
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
                      <div className="tfh-mobile-item-top">
                        <strong>{row.first_name} {row.last_name}</strong>
                        <StatusBadge status={row.status} />
                      </div>
                      <p>{row.email}</p>
                      <p>{row.phone || "-"}</p>
                      <p>Pokusaj: {row.attempt_no}</p>

                      {row.video_blob_url && (
                        <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>Pregled videa</Button>
                      )}

                      {row.status === "pending" ? (
                        <ActionPanel row={row} />
                      ) : (
                        row.video_blob_url && (
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="tfh-action-grid-btn tfh-action-grid-btn--ghost"
                            isLoading={busyDeleteId === row.submission_id}
                            onPress={() => deletePhase1Video(row)}
                          >
                            Obrisi video
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
