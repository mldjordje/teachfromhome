"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Input, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { apiGet } from "@library/apiClient";

const AdminCandidatesPage = () => {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [phase, setPhase] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRows = async () => {
    setLoading(true);
    try {
      const search = new URLSearchParams({
        status,
        phase,
        q: query,
        page: String(page),
        pageSize: String(pageSize),
      });

      const payload = await apiGet(`/api/admin/candidates?${search.toString()}`);
      setRows(payload.rows || []);
      setTotal(Number(payload.total || 0));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Neuspesno ucitavanje kandidata.");
      setRows([]);
      setTotal(0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [status, phase, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const onPhaseChange = (value) => {
    setPhase(value);
    setPage(1);
  };

  const onSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadRows();
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Kandidati" subtitle="Pregled kandidata sa brzim filterima i detaljnim prikazom.">
        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="grid gap-3 md:grid-cols-4">
            <select className="tfh-admin-filter-select" value={status} onChange={(e) => onStatusChange(e.target.value)}>
              <option value="all">Svi statusi</option>
              <option value="pending">Na cekanju</option>
              <option value="submitted">Poslato</option>
              <option value="retry">Retry</option>
              <option value="accepted">Prihvaceno</option>
              <option value="rejected">Odbijeno</option>
              <option value="moved_to_phase2">Prebaceno u fazu 2</option>
            </select>

            <select className="tfh-admin-filter-select" value={phase} onChange={(e) => onPhaseChange(e.target.value)}>
              <option value="all">Sve faze</option>
              <option value="phase1">phase1</option>
              <option value="phase2">phase2</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
            </select>

            <Input
              value={query}
              onValueChange={setQuery}
              placeholder="Pretraga po email-u, imenu ili telefonu"
              variant="bordered"
              className="md:col-span-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch();
              }}
            />

            <div className="flex flex-wrap gap-2">
              <Button onPress={onSearch} className="tfh-action-grid-btn">
                Pretrazi
              </Button>
              <Button onPress={loadRows} variant="bordered" className="tfh-action-grid-btn">
                Osvezi
              </Button>
            </div>

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

            <div className="flex items-center text-sm text-slate-600">{total} ukupno</div>
          </CardBody>
        </Card>

        <Card className="tfh-admin-panel-card mb-4">
          <CardBody className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Strana {page} od {totalPages}
            </div>
            <div className="flex gap-2">
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
            <h3 className="text-lg font-semibold">Lista kandidata</h3>
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
                  <article key={row.user_id} className="tfh-mobile-item tfh-mobile-item--admin">
                    <div className="tfh-mobile-item-top">
                      <strong>
                        {row.first_name} {row.last_name}
                      </strong>
                      <StatusBadge status={row.candidate_status} />
                    </div>
                    <p>{row.email}</p>
                    <p>{row.phone || "-"}</p>
                    <p>Faza: {row.current_phase || "phase1"}</p>
                    <div className="flex gap-2">
                      <Button as={Link} href={`/admin/candidates/${row.user_id}`} size="sm" color="primary">
                        Otvori detalj
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p>Nema kandidata za prikaz.</p>
            )}
          </CardBody>
        </Card>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminCandidatesPage;
