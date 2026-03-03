import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, Chip, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";
import { getAccessTokenOrThrow } from "@library/auth";

const trackedEvents = ["visits", "started_signup", "phase1_submitted", "phase1_passed", "phase2_submitted", "accepted"];

const AdminDashboardPage = () => {
  const { supabase, isConfigured, configError } = useAuth();
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
      if (!supabase || !isConfigured) {
        setError(configError || "Supabase is not configured.");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const baseRequests = [
          supabase
            .from("teacher_phase1_submissions")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")
            .eq("is_deleted", false),
          supabase
            .from("teacher_phase2_tasks")
            .select("*", { count: "exact", head: true })
            .in("status", ["submitted", "retry", "assigned"]),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("current_phase", "accepted"),
        ];

        const analyticsRequests = trackedEvents.map((eventName) =>
          supabase.from("analytics_events").select("*", { count: "exact", head: true }).eq("event_name", eventName),
        );

        const responses = await Promise.all([...baseRequests, ...analyticsRequests]);
        const [phase1Res, phase2Res, acceptedRes, ...analyticsRes] = responses;

        const firstError =
          phase1Res.error ||
          phase2Res.error ||
          acceptedRes.error ||
          analyticsRes.find((row) => row.error)?.error;

        if (firstError) {
          throw firstError;
        }

        const summary = trackedEvents.reduce((acc, eventName, index) => {
          acc[eventName] = analyticsRes[index].count ?? 0;
          return acc;
        }, {});

        setPhase1Pending(phase1Res.count ?? 0);
        setPhase2Pending(phase2Res.count ?? 0);
        setAcceptedCount(acceptedRes.count ?? 0);
        setAnalyticsSummary(summary);
        setError("");
      } catch (loadError) {
        setError(loadError?.message || "Failed to load admin dashboard.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [configError, isConfigured, supabase]);

  const runStorageCleanup = async () => {
    setMaintenanceMessage("");

    if (!supabase) {
      setMaintenanceMessage("Supabase client missing.");
      return;
    }

    setMaintenanceBusy(true);

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);
      const result = await callEdgeFunction({
        functionName: "admin_cleanup_storage",
        accessToken,
        body: {},
      });

      setMaintenanceMessage(
        `Cleanup done. Deleted stale: ${result?.deleted?.stale || 0}, orphan: ${result?.deleted?.orphan || 0}.`,
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
                <Button as={Link} href="/admin/training" variant="bordered" className="tfh-action-grid-btn">
                  Manage Training Videos
                </Button>
                <Button as={Link} href="/admin/showcase" variant="bordered" className="tfh-action-grid-btn">
                  Manage Showcase Clips
                </Button>
                <Button as={Link} href="/admin/referrals" variant="bordered" className="tfh-action-grid-btn">
                  Manage Referrals
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
              <Alert
                color={maintenanceMessage.toLowerCase().includes("failed") ? "danger" : "success"}
                title={maintenanceMessage}
              />
            )}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default AdminDashboardPage;
