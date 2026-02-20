import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";

const AdminDashboardPage = () => {
  const { supabase } = useAuth();
  const [events, setEvents] = useState([]);
  const [phase1Pending, setPhase1Pending] = useState(0);
  const [phase2Pending, setPhase2Pending] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [
        { data: analyticsRows },
        { count: phase1Count },
        { count: phase2Count },
        { count: acceptedProfiles },
      ] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("event_name")
          .order("created_at", { ascending: false })
          .limit(1000),
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
      ]);

      setEvents(analyticsRows ?? []);
      setPhase1Pending(phase1Count ?? 0);
      setPhase2Pending(phase2Count ?? 0);
      setAcceptedCount(acceptedProfiles ?? 0);
      setLoading(false);
    };

    load();
  }, [supabase]);

  const analyticsSummary = useMemo(() => {
    const summary = {
      visits: 0,
      started_signup: 0,
      phase1_submitted: 0,
      phase1_passed: 0,
      phase2_submitted: 0,
      accepted: 0,
    };

    events.forEach((row) => {
      if (Object.prototype.hasOwnProperty.call(summary, row.event_name)) {
        summary[row.event_name] += 1;
      }
    });

    return summary;
  }, [events]);

  return (
    <RequireAuth adminOnly>
      <AppShell title="Admin Dashboard" subtitle="Overview of queues, approvals and operational actions.">
        {loading ? (
          <div className="tfh-alert">Loading admin metrics...</div>
        ) : (
          <div className="tfh-grid">
            <div className="tfh-kpi-grid">
              <div className="tfh-kpi-card">
                <span className="tfh-kpi-label">Phase 1 Pending</span>
                <strong className="tfh-kpi-value">{phase1Pending}</strong>
              </div>
              <div className="tfh-kpi-card">
                <span className="tfh-kpi-label">Phase 2 Pending</span>
                <strong className="tfh-kpi-value">{phase2Pending}</strong>
              </div>
              <div className="tfh-kpi-card">
                <span className="tfh-kpi-label">Accepted Teachers</span>
                <strong className="tfh-kpi-value">{acceptedCount}</strong>
              </div>
            </div>

            <div className="tfh-card">
              <h3>Analytics (MVP)</h3>
              <div className="tfh-analytics-grid">
                <div>
                  <span>Visits</span>
                  <strong>{analyticsSummary.visits}</strong>
                </div>
                <div>
                  <span>Started signup</span>
                  <strong>{analyticsSummary.started_signup}</strong>
                </div>
                <div>
                  <span>Phase 1 submitted</span>
                  <strong>{analyticsSummary.phase1_submitted}</strong>
                </div>
                <div>
                  <span>Phase 1 passed</span>
                  <strong>{analyticsSummary.phase1_passed}</strong>
                </div>
                <div>
                  <span>Phase 2 submitted</span>
                  <strong>{analyticsSummary.phase2_submitted}</strong>
                </div>
                <div>
                  <span>Accepted</span>
                  <strong>{analyticsSummary.accepted}</strong>
                </div>
              </div>
            </div>

            <div className="tfh-card">
              <h3>Quick Actions</h3>
              <div className="tfh-quick-grid">
                <Link href="/admin/phase1" className="tfh-btn">
                  Open Phase 1 Queue
                </Link>
                <Link href="/admin/phase2" className="tfh-btn">
                  Open Phase 2 Queue
                </Link>
                <Link href="/admin/training" className="tfh-btn tfh-btn-outline">
                  Manage Training Videos
                </Link>
                <Link href="/admin/referrals" className="tfh-btn tfh-btn-outline">
                  Manage Referrals
                </Link>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default AdminDashboardPage;
