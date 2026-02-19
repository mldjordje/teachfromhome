import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";

const TeacherNotificationsPage = () => {
  const { supabase, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const markAsRead = async (notificationId) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id);
    await loadNotifications();
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    await loadNotifications();
  };

  return (
    <RequireAuth>
      <AppShell title="Notifications" subtitle="In-app notifications for onboarding workflow.">
        <div className="tfh-grid">
          <div className="tfh-card">
            <div className="tfh-actions">
              <button type="button" className="tfh-btn tfh-btn-outline" onClick={markAllAsRead}>
                Mark all as read
              </button>
            </div>
          </div>

          <div className="tfh-card">
            {loading ? (
              <p>Loading notifications...</p>
            ) : notifications.length ? (
              <div className="tfh-table-wrap">
                <table className="tfh-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Body</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <StatusBadge status={row.is_read ? "accepted" : "pending"} />
                        </td>
                        <td>{row.type}</td>
                        <td>{row.title}</td>
                        <td>{row.body}</td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                        <td>
                          {!row.is_read && (
                            <button type="button" className="tfh-btn tfh-btn-outline" onClick={() => markAsRead(row.id)}>
                              Mark read
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No notifications yet.</p>
            )}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherNotificationsPage;
