"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, Chip, Divider, Spinner } from "@heroui/react";
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
        setError(loadError?.message || "Failed to load admin dashboard.");
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
        `Cleanup done. Deleted stale: ${result?.deleted?.stale || 0}, closed: ${result?.deleted?.closed || 0}.`,
      );
    } catch (cleanupError) {
      setMaintenanceMessage(cleanupError?.message || "Storage cleanup failed.");
    } finally {
      setMaintenanceBusy(false);
    }
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Dashboard" subtitle="Pregled queue-ova, metrika i operativnih akcija.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        {loading ? (
          <Card className="tfh-admin-panel-card">
            <CardBody className="flex flex-row items-center gap-3 py-8">
              <Spinner size="sm" />
              <p>Loading admin metrics...</p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="text-sm text-slate-500">Phase 1 Pending</span>
                  <strong className="text-4xl font-semibold text-slate-900">{phase1Pending}</strong>
                </CardBody>
              </Card>
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="text-sm text-slate-500">Phase 2 Pending</span>
                  <strong className="text-4xl font-semibold text-slate-900">{phase2Pending}</strong>
                </CardBody>
              </Card>
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="text-sm text-slate-500">Accepted Teachers</span>
                  <strong className="text-4xl font-semibold text-slate-900">{acceptedCount}</strong>
                </CardBody>
              </Card>
            </div>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Analytics (MVP)</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {trackedEvents.map((eventName) => (
                    <Card key={eventName} className="tfh-analytics-tile" shadow="none">
                      <CardBody className="py-3">
                        <span className="text-xs uppercase tracking-wide text-slate-500">{eventName.replaceAll("_", " ")}</span>
                        <Chip color="primary" variant="flat" className="mt-2 w-fit tfh-analytics-chip">
                          {analyticsSummary[eventName] ?? 0}
                        </Chip>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </CardHeader>
              <Divider />
              <CardBody className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Button as={Link} href="/admin/phase1" color="primary" className="tfh-action-grid-btn">
                  Open Phase 1 Queue
                </Button>
                <Button as={Link} href="/admin/phase2" color="primary" className="tfh-action-grid-btn">
                  Open Phase 2 Queue
                </Button>
                <Button as={Link} href="/admin/candidates" color="primary" className="tfh-action-grid-btn">
                  Candidate Review
                </Button>
                <Button as={Link} href="/admin/training" variant="bordered" className="tfh-action-grid-btn">
                  Manage Training Videos
                </Button>
                <Button as={Link} href="/admin/referrals" variant="bordered" className="tfh-action-grid-btn">
                  Manage Referrals
                </Button>
                <Button as={Link} href="/admin/showcase" variant="bordered" className="tfh-action-grid-btn">
                  Showcase Clips
                </Button>
                <Button
                  color="warning"
                  variant="flat"
                  className="tfh-action-grid-btn"
                  onPress={runStorageCleanup}
                  isLoading={maintenanceBusy}
                >
                  {maintenanceBusy ? "Running cleanup..." : "Run Storage Cleanup"}
                </Button>
              </CardBody>
            </Card>

            {maintenanceMessage && (
              <Alert color={maintenanceMessage.toLowerCase().includes("failed") ? "danger" : "success"} title={maintenanceMessage} />
            )}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default AdminDashboardPage;
