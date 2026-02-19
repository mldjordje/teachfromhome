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
  }, []);

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
      <AppShell title="Admin Dashboard" subtitle="Queues, key metrics and review entry points.">
        {loading ? (
          <div className="tfh-alert">Loading admin metrics...</div>
        ) : (
          <div className="tfh-grid">
            <div className="tfh-grid tfh-grid-3">
              <div className="tfh-card">
                <h3>Phase 1 queue</h3>
                <p>{phase1Pending}</p>
              </div>
              <div className="tfh-card">
                <h3>Phase 2 queue</h3>
                <p>{phase2Pending}</p>
              </div>
              <div className="tfh-card">
                <h3>Accepted teachers</h3>
                <p>{acceptedCount}</p>
              </div>
            </div>

            <div className="tfh-card">
              <h3>Analytics events (MVP)</h3>
              <div className="tfh-grid tfh-grid-3">
                <div>visits: {analyticsSummary.visits}</div>
                <div>started_signup: {analyticsSummary.started_signup}</div>
                <div>phase1_submitted: {analyticsSummary.phase1_submitted}</div>
                <div>phase1_passed: {analyticsSummary.phase1_passed}</div>
                <div>phase2_submitted: {analyticsSummary.phase2_submitted}</div>
                <div>accepted: {analyticsSummary.accepted}</div>
              </div>
            </div>

            <div className="tfh-card">
              <h3>Quick actions</h3>
              <div className="tfh-actions">
                <Link href="/admin/phase1" className="tfh-btn">
                  Open Phase 1 queue
                </Link>
                <Link href="/admin/phase2" className="tfh-btn tfh-btn-outline">
                  Open Phase 2 queue
                </Link>
                <Link href="/admin/training" className="tfh-btn tfh-btn-outline">
                  Manage training videos
                </Link>
                <Link href="/admin/referrals" className="tfh-btn tfh-btn-outline">
                  Manage referrals
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
