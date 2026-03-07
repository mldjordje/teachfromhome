"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import AdminPhaseSwitch from "@components/app/AdminPhaseSwitch";
import VideoPreviewModal from "@components/app/VideoPreviewModal";
import { apiGet } from "@library/apiClient";

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

  const onSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadRows();
  };

  const openPreview = (row) => {
    setPreviewUrl(row.latest_video_blob_url || "");
    setPreviewTitle(`${row.first_name || "Kandidat"} ${row.last_name || ""} - finalni klip`.trim());
  };

  const closePreview = () => {
    setPreviewUrl("");
    setPreviewTitle("");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell
        title="Prihvaceni kandidati"
        subtitle="Kandidati koji su prosli Fazu 2. Pregledaj i preuzmi poslednji klip za prosledjivanje HR timu."
      >
        <AdminPhaseSwitch />

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
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 20);
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
            <h3 className="text-lg font-semibold">Lista prihvacenih kandidata</h3>
          </CardHeader>
          <Divider />
          <CardBody>
            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <Spinner size="sm" />
                <p>Ucitavanje kandidata...</p>
              </div>
            ) : rows.length ? (
              <div className="tfh-mobile-list">
                {rows.map((row) => (
                  <article key={`${row.user_id}-${row.task_id}`} className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>
                        {row.first_name} {row.last_name}
                      </strong>
                      <span className="tfh-state-pill tfh-state-pill--ok">Prihvacen</span>
                    </div>
                    <p>{row.email}</p>
                    <p>{row.phone || "-"}</p>
                    <p>Pokusaj: {row.latest_attempt_no || "-"}</p>
                    <p>Prihvacen: {row.accepted_at ? new Date(row.accepted_at).toLocaleString() : "-"}</p>
                    <div className="flex flex-wrap gap-2">
                      {row.latest_video_blob_url && (
                        <Button size="sm" variant="bordered" onPress={() => openPreview(row)}>
                          Pregled klipa
                        </Button>
                      )}
                      {row.latest_submission_id && (
                        <Button
                          as="a"
                          href={`/api/admin/accepted-candidates/download?submissionId=${encodeURIComponent(row.latest_submission_id)}`}
                          size="sm"
                          color="success"
                        >
                          Download klipa
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
              <p>Nema prihvacenih kandidata za prikaz.</p>
            )}
          </CardBody>
        </Card>
        <VideoPreviewModal open={Boolean(previewUrl)} src={previewUrl} title={previewTitle} onClose={closePreview} />
      </AppShell>
    </RequireAuth>
  );
};

export default AdminAcceptedCandidatesPage;
