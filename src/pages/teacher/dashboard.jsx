import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { trackEvent } from "@library/analytics";

const TeacherDashboard = () => {
  const { supabase, user, profile, session } = useAuth();
  const [phase1Attempts, setPhase1Attempts] = useState([]);
  const [phase2Task, setPhase2Task] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: phase1Data }, { data: taskData }, { count: unread }] = await Promise.all([
      supabase
        .from("teacher_phase1_submissions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("attempt_no", { ascending: true }),
      supabase.from("teacher_phase2_tasks").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
    ]);

    setPhase1Attempts(phase1Data ?? []);
    setPhase2Task(taskData ?? null);
    setUnreadCount(unread ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (!session?.access_token) return;
    trackEvent({
      eventName: "visits",
      metadata: { page: "teacher_dashboard" },
      accessToken: session.access_token,
    });
  }, [session?.access_token]);

  const latestPhase1 = useMemo(() => {
    if (!phase1Attempts.length) return null;
    return phase1Attempts[phase1Attempts.length - 1];
  }, [phase1Attempts]);

  const nextStep = useMemo(() => {
    if (!latestPhase1) return "/teacher/phase1";
    if (latestPhase1.status === "pending") return "/teacher/phase1";
    if (latestPhase1.status === "rejected" && phase1Attempts.length < 3) return "/teacher/phase1";
    if (latestPhase1.status === "moved_to_phase2") return "/teacher/phase2";
    if (phase2Task && ["assigned", "retry", "submitted"].includes(phase2Task.status)) return "/teacher/phase2";
    return "/teacher/profile";
  }, [latestPhase1, phase1Attempts.length, phase2Task]);

  return (
    <RequireAuth>
      <AppShell title="Teacher Dashboard" subtitle="Overview of your application progress and next actions.">
        {loading ? (
          <div className="tfh-alert">Loading dashboard...</div>
        ) : (
          <div className="tfh-grid">
            <div className="tfh-grid tfh-grid-3">
              <div className="tfh-card">
                <h3>Current phase</h3>
                <p>{profile?.current_phase || "phase1"}</p>
              </div>
              <div className="tfh-card">
                <h3>Phase 1 attempts</h3>
                <p>{phase1Attempts.length} / 3</p>
              </div>
              <div className="tfh-card">
                <h3>Unread notifications</h3>
                <p>{unreadCount}</p>
              </div>
            </div>

            <div className="tfh-card">
              <h3>Latest status</h3>
              {latestPhase1 ? (
                <p>
                  Phase 1: <StatusBadge status={latestPhase1.status} />
                </p>
              ) : (
                <p>No Phase 1 submission yet.</p>
              )}

              {phase2Task && (
                <p>
                  Phase 2 task: <StatusBadge status={phase2Task.status} />
                </p>
              )}

              <div className="tfh-actions">
                <Link href={nextStep} className="tfh-btn">
                  Continue
                </Link>
                <Link href="/teacher/notifications" className="tfh-btn tfh-btn-outline">
                  View notifications
                </Link>
              </div>
            </div>

            {latestPhase1?.status === "moved_to_phase2" && (
              <div className="tfh-alert tfh-success">
                Congratulations, you passed Phase 1. Proceed to Phase 2 for training videos and your test sentence.
              </div>
            )}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherDashboard;
