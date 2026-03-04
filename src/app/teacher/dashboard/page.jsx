"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { trackEvent } from "@library/analytics";
import { apiGet } from "@library/apiClient";

const TeacherDashboard = () => {
  const { profile: authProfile, session } = useAuth();
  const [phase1Attempts, setPhase1Attempts] = useState([]);
  const [phase2Task, setPhase2Task] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profile, setProfile] = useState(authProfile || null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);

    try {
      const data = await apiGet("/api/teacher/dashboard");
      setPhase1Attempts(data.phase1Attempts || []);
      setPhase2Task(data.phase2Task || null);
      setUnreadCount(data.unreadCount || 0);
      setProfile(data.profile || authProfile || null);
    } catch (_error) {
      setPhase1Attempts([]);
      setPhase2Task(null);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    trackEvent({
      eventName: "visits",
      metadata: { page: "teacher_dashboard" },
    });
  }, [session?.user?.id]);

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
