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
      <AppShell title="Teacher kontrolna tabla" subtitle="Pregled trenutnog statusa i sledeceg koraka u procesu.">
        {loading ? (
          <div className="tfh-alert">Ucitavanje kontrolne table...</div>
        ) : (
          <div className="tfh-grid">
            <div className="tfh-grid tfh-grid-3">
              <div className="tfh-card">
                <h3>Trenutna faza</h3>
                <p>{profile?.current_phase || "phase1"}</p>
              </div>
              <div className="tfh-card">
                <h3>Pokusaji faze 1</h3>
                <p>{phase1Attempts.length} / 3</p>
              </div>
              <div className="tfh-card">
                <h3>Neprocitana obavestenja</h3>
                <p>{unreadCount}</p>
              </div>
            </div>

            <div className="tfh-card">
              <h3>Poslednji status</h3>
              {latestPhase1 ? (
                <p>
                  Faza 1: <StatusBadge status={latestPhase1.status} />
                </p>
              ) : (
                <p>Jos nema prijave za fazu 1.</p>
              )}

              {phase2Task && (
                <p>
                  Faza 2 zadatak: <StatusBadge status={phase2Task.status} />
                </p>
              )}

              <div className="tfh-actions">
                <Link href={nextStep} className="tfh-btn">
                  Nastavi
                </Link>
                <Link href="/teacher/notifications" className="tfh-btn tfh-btn-outline">
                  Pregled obavestenja
                </Link>
              </div>
            </div>

            {latestPhase1?.status === "moved_to_phase2" && (
              <div className="tfh-alert tfh-success">
                Faza 1 je uspesno zavrsena. Nastavi na fazu 2 i snimi dodeljenu recenicu.
              </div>
            )}
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherDashboard;
