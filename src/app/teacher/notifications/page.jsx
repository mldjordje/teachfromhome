"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { apiGet, apiPatch, apiPost } from "@library/apiClient";

const TeacherNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const payload = await apiGet("/api/teacher/notifications");
      setNotifications(payload.rows || []);
    } catch (_error) {
      setNotifications([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    await apiPatch(`/api/teacher/notifications/${notificationId}`);
    await loadNotifications();
  };

  const markAllAsRead = async () => {
    await apiPost("/api/teacher/notifications/mark-all", {});
    await loadNotifications();
  };

  return (
    <RequireAuth>
      <AppShell title="Obavestenja" subtitle="Sva obavestenja vezana za onboarding proces.">
        <div className="tfh-grid">
          <div className="tfh-card">
            <div className="tfh-actions">
              <button type="button" className="tfh-btn tfh-btn-outline" onClick={markAllAsRead}>
                Oznaci sve kao procitano
              </button>
            </div>
          </div>

          <div className="tfh-card">
            {loading ? (
              <p>Ucitavanje obavestenja...</p>
            ) : notifications.length ? (
              <div className="tfh-mobile-list">
                {notifications.map((row) => (
                  <article key={row.id} className="tfh-mobile-item">
                    <div className="tfh-mobile-item-top">
                      <StatusBadge status={row.is_read ? "accepted" : "pending"} />
                      <strong>{row.type}</strong>
                    </div>
                    <p>{row.title}</p>
                    <p>{row.body}</p>
                    <p>{new Date(row.created_at).toLocaleString()}</p>
                    {!row.is_read && (
                      <button type="button" className="tfh-btn tfh-btn-outline" onClick={() => markAsRead(row.id)}>
                        Oznaci kao procitano
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p>Trenutno nema obavestenja.</p>
            )}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherNotificationsPage;
