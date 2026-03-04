"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { apiGet, apiPost } from "@library/apiClient";

const trackedEvents = ["visits", "started_signup", "phase1_submitted", "phase1_passed", "phase2_submitted", "accepted"];

const AdminDashboardPage = () => {
  const [phase1Pending, setPhase1Pending] = useState(0);
  const [phase2Pending, setPhase2Pending] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [analyticsSummary, setAnalyticsSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await apiGet("/api/admin/dashboard");
        setPhase1Pending(payload.phase1Pending || 0);
        setPhase2Pending(payload.phase2Pending || 0);
        setAcceptedCount(payload.acceptedCount || 0);
        setAnalyticsSummary(payload.analyticsSummary || {});
        setError("");
      } catch (loadError) {
        setError(loadError?.message || "Neuspesno ucitavanje admin kontrolne table.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const runStorageCleanup = async () => {
    setMaintenanceMessage("");
    setMaintenanceBusy(true);

    try {
      const result = await apiPost("/api/admin/storage/cleanup", {});
      setMaintenanceMessage(
        `Ciscenje zavrseno. Obrisano zastarelih: ${result?.deleted?.stale || 0}, zatvorenih: ${result?.deleted?.closed || 0}.`,
      );
    } catch (cleanupError) {
      setMaintenanceMessage(cleanupError?.message || "Storage cleanup nije uspeo.");
    } finally {
      setMaintenanceBusy(false);
    }
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin kontrolna tabla" subtitle="Pregled queue-ova, metrika i operativnih akcija.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        {loading ? (
          <Card className="tfh-admin-panel-card">
            <CardBody className="flex flex-row items-center gap-3 py-8">
              <Spinner size="sm" />
              <p>Ucitavanje admin metrika...</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="tfh-admin-kpi-label">Faza 1 na cekanju</span>
                  <strong className="tfh-admin-kpi-value">{phase1Pending}</strong>
                </CardBody>
              </Card>
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="tfh-admin-kpi-label">Faza 2 na cekanju</span>
                  <strong className="tfh-admin-kpi-value">{phase2Pending}</strong>
                </CardBody>
              </Card>
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="tfh-admin-kpi-label">Prihvaceni kandidati</span>
                  <strong className="tfh-admin-kpi-value">{acceptedCount}</strong>
                </CardBody>
              </Card>
            </div>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Analitika</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div className="tfh-admin-analytics-grid">
                  {trackedEvents.map((eventName) => (
                    <article key={eventName} className="tfh-admin-analytics-item">
                      <span>{eventName.replaceAll("_", " ")}</span>
                      <strong>{analyticsSummary[eventName] ?? 0}</strong>
                    </article>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Brze akcije</h3>
              </CardHeader>
              <Divider />
              <CardBody className="tfh-admin-action-grid">
                <Link href="/admin/phase1" className="tfh-admin-quick-link">Faza 1 queue</Link>
                <Link href="/admin/phase2" className="tfh-admin-quick-link">Faza 2 queue</Link>
                <Link href="/admin/candidates" className="tfh-admin-quick-link">Kandidati</Link>
                <Link href="/admin/training" className="tfh-admin-quick-link tfh-admin-quick-link--ghost">Trening klipovi</Link>
                <Link href="/admin/referrals" className="tfh-admin-quick-link tfh-admin-quick-link--ghost">Preporuke</Link>
                <Link href="/admin/showcase" className="tfh-admin-quick-link tfh-admin-quick-link--ghost">Showcase klipovi</Link>
                <button
                  type="button"
                  className="tfh-admin-quick-link tfh-admin-quick-link--ghost"
                  onClick={runStorageCleanup}
                  disabled={maintenanceBusy}
                >
                  {maintenanceBusy ? "Pokretanje cleanup-a..." : "Pokreni storage cleanup"}
                </button>
              </CardBody>
            </Card>

            {maintenanceMessage && (
              <Alert color={maintenanceMessage.toLowerCase().includes("nije") ? "danger" : "success"} title={maintenanceMessage} />
            )}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default AdminDashboardPage;
