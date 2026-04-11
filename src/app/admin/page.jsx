"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { apiGet, apiPost } from "@library/apiClient";

const trackedEvents = ["visits", "started_signup", "phase1_submitted", "phase1_passed", "accepted"];

const AdminDashboardPage = () => {
  const [phase1Pending, setPhase1Pending] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [analyticsSummary, setAnalyticsSummary] = useState({});
  const [funnel, setFunnel] = useState({ stages: [], visit_to_accept_rate: 0, signup_to_accept_rate: 0 });
  const [dailyFunnel, setDailyFunnel] = useState([]);
  const [stuckCandidates, setStuckCandidates] = useState([]);
  const [stuckSummary, setStuckSummary] = useState({ total: 0, phase1_pending_review: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [reminderBusyKey, setReminderBusyKey] = useState("");
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const payload = await apiGet("/api/admin/dashboard");
        setPhase1Pending(payload.phase1Pending || 0);
        setAcceptedCount(payload.acceptedCount || 0);
        setAnalyticsSummary(payload.analyticsSummary || {});
        setFunnel(payload.funnel || { stages: [] });
        setDailyFunnel(payload.dailyFunnel || []);
        setStuckCandidates(payload.stuckCandidates || []);
        setStuckSummary(payload.stuckSummary || { total: 0, phase1_pending_review: 0 });
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

  const sendReminder = async (row) => {
    if (!row?.reminder_kind) return;

    const busyKey = `${row.user_id}-${row.reminder_kind}`;
    setReminderBusyKey(busyKey);
    setMaintenanceMessage("");

    try {
      await apiPost("/api/admin/candidates/remind", {
        user_id: row.user_id,
        kind: row.reminder_kind,
      });
      setMaintenanceMessage(`Reminder je poslat kandidatu ${row.email}.`);
    } catch (reminderError) {
      setMaintenanceMessage(reminderError?.message || "Slanje remindera nije uspelo.");
    } finally {
      setReminderBusyKey("");
    }
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin kontrolna tabla" subtitle="Pregled faze 1, HR kandidata i operativnih akcija.">
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
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="tfh-admin-kpi-label">Faza 1 na cekanju</span>
                  <strong className="tfh-admin-kpi-value">{phase1Pending}</strong>
                </CardBody>
              </Card>
              <Card className="tfh-kpi-panel">
                <CardBody>
                  <span className="tfh-admin-kpi-label">Kandidati za HR kontakt</span>
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
                <h3 className="text-lg font-semibold">Funnel konverzije</h3>
              </CardHeader>
              <Divider />
              <CardBody className="grid gap-3">
                <div className="tfh-funnel-summary">
                  <span>Visit to HR: {funnel.visit_to_accept_rate ?? 0}%</span>
                  <span>Signup to HR: {funnel.signup_to_accept_rate ?? 0}%</span>
                </div>
                <div className="tfh-funnel-grid">
                  {(funnel.stages || []).map((stage) => (
                    <article key={stage.key} className="tfh-funnel-stage">
                      <span>{stage.label}</span>
                      <strong>{stage.count}</strong>
                      <small>{stage.rate_from_prev}% od prethodne faze</small>
                    </article>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Dnevni trend (14 dana)</h3>
              </CardHeader>
              <Divider />
              <CardBody>
                {dailyFunnel.length ? (
                  <div className="tfh-funnel-daily-list">
                    {dailyFunnel.map((day) => (
                      <article key={day.day} className="tfh-funnel-daily-item">
                        <strong>{day.day}</strong>
                        <span>Posete: {day.visits}</span>
                        <span>Signup: {day.started_signup}</span>
                        <span>Faza1: {day.phase1_submitted}</span>
                        <span>HR: {day.accepted}</span>
                        <span>HR/visit: {day.accept_rate_from_visits}%</span>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>Nema dovoljno dogadjaja za dnevni trend.</p>
                )}
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Zaglavljeni kandidati</h3>
              </CardHeader>
              <Divider />
              <CardBody className="tfh-stuck-board">
                <div className="tfh-funnel-summary">
                  <span>Ukupno: {stuckSummary.total || 0}</span>
                  <span>Faza 1 review: {stuckSummary.phase1_pending_review || 0}</span>
                </div>
                {stuckCandidates.length ? (
                  <div className="tfh-stuck-list">
                    {stuckCandidates.map((row) => {
                      const reminderKey = `${row.user_id}-${row.reminder_kind}`;
                      const displayName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim() || row.email || row.user_id;
                      return (
                        <article key={row.id} className="tfh-stuck-item">
                          <div className="tfh-stuck-item-copy">
                            <strong>{displayName}</strong>
                            <p>{row.email}</p>
                            <p>
                              {row.stuck_label} - {row.days_waiting} dan(a)
                            </p>
                            {row.attempts_progress && <p>Pokusaji: {row.attempts_progress}</p>}
                          </div>
                          <div className="tfh-stuck-item-actions">
                            <Link href={row.queue_link} className="tfh-admin-quick-link tfh-admin-quick-link--ghost">
                              Otvori queue
                            </Link>
                            <Link href={row.candidate_link} className="tfh-admin-quick-link tfh-admin-quick-link--ghost">
                              Kandidat
                            </Link>
                            {row.reminder_kind && (
                              <Button
                                size="sm"
                                className="tfh-admin-quick-link"
                                isLoading={reminderBusyKey === reminderKey}
                                onPress={() => sendReminder(row)}
                              >
                                Posalji reminder
                              </Button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p>Nema kandidata koji su trenutno zaglavljeni po pravilima.</p>
                )}
              </CardBody>
            </Card>

            <Card className="tfh-admin-panel-card">
              <CardHeader>
                <h3 className="text-lg font-semibold">Brze akcije</h3>
              </CardHeader>
              <Divider />
              <CardBody className="tfh-admin-action-grid">
                <Link href="/admin/phase1" className="tfh-admin-quick-link">Faza 1 queue</Link>
                <Link href="/admin/accepted" className="tfh-admin-quick-link">Prihvaceni kandidati</Link>
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
