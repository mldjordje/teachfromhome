"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { trackEvent } from "@library/analytics";
import { apiGet } from "@library/apiClient";
import { buildTeacherApplicationFlow } from "@config/teacherFlow";

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

  const application = useMemo(
    () => buildTeacherApplicationFlow({ phase1Attempts, phase2Task }),
    [phase1Attempts, phase2Task],
  );

  const flowSteps = useMemo(() => {
    const hasPhase1 = Boolean(latestPhase1);
    const phase1Reviewed = Boolean(latestPhase1 && latestPhase1.status !== "pending");
    const hasPhase2Task = Boolean(phase2Task);
    const hasPhase2Submission = Boolean(phase2Task && Number(phase2Task.current_attempts || 0) > 0);
    const finalDecision = Boolean(phase2Task && ["accepted", "rejected"].includes(phase2Task.status));

    return [
      { key: "phase1", label: "Faza 1", done: hasPhase1 },
      { key: "review", label: "Review", done: phase1Reviewed },
      { key: "phase2", label: "Faza 2", done: hasPhase2Task && hasPhase2Submission },
      { key: "result", label: "Rezultat", done: finalDecision },
    ];
  }, [latestPhase1, phase2Task]);

  return (
    <RequireAuth>
      <AppShell title="Moj status prijave" subtitle="Jasan pregled gde si trenutno i sta je sledeci korak.">
        {loading ? (
          <div className="tfh-alert">Ucitavanje statusa...</div>
        ) : (
          <div className="tfh-grid">
            <div className={`tfh-card tfh-application-status tfh-application-status--${application.tone}`}>
              <h3>{application.title}</h3>
              <p>{application.description}</p>

              <div className="tfh-flow-steps" aria-label="Napredak prijave">
                {flowSteps.map((step) => (
                  <span key={step.key} className={`tfh-flow-step ${step.done ? "is-done" : ""}`}>
                    {step.label}
                  </span>
                ))}
              </div>

              <div className="tfh-actions">
                <Link href={application.nextPath} className="tfh-btn">
                  {application.ctaLabel}
                </Link>
                <Link href="/teacher/notifications" className="tfh-btn tfh-btn-outline">
                  Obavestenja
                </Link>
              </div>
            </div>

            {application.feedback && <div className="tfh-alert">Feedback: {application.feedback}</div>}

            <div className="tfh-grid tfh-grid-3">
              <div className="tfh-card">
                <h3>Trenutna faza</h3>
                <p>
                  <StatusBadge status={profile?.current_phase || "phase1"} />
                </p>
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
              <h3>Detalji statusa</h3>
              {latestPhase1 ? (
                <p>
                  Faza 1: <StatusBadge status={latestPhase1.status} />
                </p>
              ) : (
                <p>Faza 1 jos nije poslata.</p>
              )}

              {phase2Task && (
                <p>
                  Faza 2: <StatusBadge status={phase2Task.status} />
                </p>
              )}
            </div>
          </div>
        )}
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherDashboard;
