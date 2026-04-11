"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiGet } from "@library/apiClient";

const dateTimeFormatter = new Intl.DateTimeFormat("sr-RS", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return dateTimeFormatter.format(parsed);
};

const getDisplayName = (row) => {
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return fullName || row.email || "Kandidat";
};

const AdminAcceptedCandidatesPage = () => {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  const loadRows = async () => {
    setLoading(true);
    try {
      const search = new URLSearchParams({
        q: query,
        page: String(page),
        pageSize: String(pageSize),
      });
      const payload = await apiGet(`/api/admin/accepted-candidates?${search.toString()}`);
      setRows(payload.rows || []);
      setTotal(Number(payload.total || 0));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Neuspesno ucitavanje prihvacenih kandidata.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const summary = useMemo(() => {
    const withVideo = rows.filter((row) => Boolean(row.latest_video_blob_url)).length;
    const reviewedDates = rows.map((row) => row.accepted_at).filter(Boolean).sort((a, b) => new Date(b) - new Date(a));

    return {
      onPage: rows.length,
      withVideo,
      latestAcceptedAt: reviewedDates[0] || null,
    };
  }, [rows]);

  const onSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadRows();
  };

  const openPreview = (row) => {
    setPreviewUrl(row.latest_video_blob_url || "");
    setPreviewTitle(`${getDisplayName(row)} - faza 1 snimak`);
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell
        title="Prihvaceni kandidati"
        subtitle="Kandidati koji su prosli fazu 1 i spremni su za HR kontakt. Ovde brzo pregledas snimak, kontakt podatke i detalje prijave."
      >
        <AdminPhaseSwitch />

        <Card className="tfh-admin-panel-card tfh-accepted-summary-card mb-4">
          <CardBody className="tfh-accepted-summary-body">
            <div className="tfh-accepted-summary-copy">
              <span className="tfh-accepted-summary-kicker">HR handoff</span>
              <h3>Lista za sledeci korak</h3>
              <p>Pregledaj ko je spreman za kontakt, proveri poslednji klip i otvori detaljan profil kandidata kad treba.</p>
            </div>

            <div className="tfh-accepted-summary-stats">
              <article>
                <strong>{total}</strong>
                <span>ukupno prihvacenih</span>
              </article>
              <article>
                <strong>{summary.onPage}</strong>
                <span>na ovoj strani</span>
              </article>
              <article>
                <strong>{summary.withVideo}</strong>
                <span>sa dostupnim klipom</span>
              </article>
              <article>
                <strong>{summary.latestAcceptedAt ? formatDateTime(summary.latestAcceptedAt) : "-"}</strong>
                <span>poslednje odobrenje</span>
              </article>
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="grid gap-3 md:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pretraga po email-u, imenu ili telefonu"
              className="tfh-admin-control md:col-span-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch();
              }}
            />

            <select
              className="tfh-admin-filter-select"
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value) || 20);
                setPage(1);
              }}
            >
              <option value="20">20 po strani</option>
              <option value="50">50 po strani</option>
              <option value="100">100 po strani</option>
            </select>

            <div className="tfh-admin-pagination-actions">
              <Button onPress={onSearch} className="tfh-action-grid-btn">
                Pretrazi
              </Button>
              <Button onPress={loadRows} variant="bordered" className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                Osvezi
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="tfh-admin-pagination">
            <div className="text-sm tfh-admin-muted">
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
            <h3 className="text-lg font-semibold">Kandidati spremni za HR</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Ucitavanje kandidata...</p>
              </div>
            ) : rows.length ? (
              <div className="tfh-accepted-grid">
                {rows.map((row) => (
                  <article key={`${row.user_id}-${row.latest_submission_id || "accepted"}`} className="tfh-accepted-card">
                    <div className="tfh-accepted-card-top">
                      <div>
                        <p className="tfh-accepted-card-label">Kandidat</p>
                        <strong>{getDisplayName(row)}</strong>
                      </div>
                      <div className="tfh-accepted-pill-row">
                        <span className="tfh-state-pill tfh-state-pill--ok">Prihvacen</span>
                        <span className="tfh-state-pill">{row.current_phase === "phase2" ? "Legacy accepted" : "HR handoff"}</span>
                      </div>
                    </div>

                    <div className="tfh-accepted-contact-grid">
                      <div>
                        <span>Email</span>
                        <p>{row.email || "-"}</p>
                      </div>
                      <div>
                        <span>Telefon</span>
                        <p>{row.phone || "-"}</p>
                      </div>
                    </div>

                    <div className="tfh-accepted-meta-grid">
                      <article>
                        <span>Pokusaj faze 1</span>
                        <strong>{row.latest_attempt_no || "-"}</strong>
                      </article>
                      <article>
                        <span>Prosao/la fazu 1</span>
                        <strong>{formatDateTime(row.accepted_at)}</strong>
                      </article>
                      <article>
                        <span>Poslednji upload</span>
                        <strong>{formatDateTime(row.latest_submission_created_at)}</strong>
                      </article>
                    </div>

                    <div className="tfh-accepted-clip-status">
                      <span>{row.latest_video_blob_url ? "Klip je dostupan za pregled i download." : "Klip nije sacuvan za ovaj unos."}</span>
                    </div>

                    <div className="tfh-accepted-actions">
                      {row.latest_video_blob_url && (
                        <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>
                          Pregled snimka
                        </Button>
                      )}

                      {row.latest_submission_id && (
                        <Button
                          as="a"
                          href={`/api/admin/accepted-candidates/download?submissionId=${encodeURIComponent(row.latest_submission_id)}`}
                          size="sm"
                          color="success"
                        >
                          Download snimka
                        </Button>
                      )}

                      <Button as={Link} href={`/admin/candidates/${row.user_id}`} size="sm" variant="flat">
                        Otvori detalj
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="tfh-accepted-empty">
                <strong>Nema prihvacenih kandidata za prikaz.</strong>
                <p>Promeni filtere ili osvezi listu ako ocekujes nove rezultate.</p>
              </div>
            )}
          </CardBody>
        </Card>

        <VideoPreviewModal open={Boolean(previewUrl)} src={previewUrl} title={previewTitle} onClose={closePreview} />
      </AppShell>
    </RequireAuth>
  );
};

export default AdminAcceptedCandidatesPage;
