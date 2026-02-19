import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { callEdgeFunction } from "@library/edgeClient";

const AdminReferralsPage = () => {
  const { supabase, session } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [referredUserId, setReferredUserId] = useState("");
  const [eligibleAt, setEligibleAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRewards = async () => {
    const { data, error: loadError } = await supabase
      .from("referral_rewards")
      .select("*")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      setRewards([]);
      return;
    }
    setError("");
    setRewards(data ?? []);
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const markEligible = async (e) => {
    e.preventDefault();
    if (!session?.access_token) return;
    if (!referredUserId.trim()) {
      setError("referred_user_id is required");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await callEdgeFunction({
        functionName: "admin_mark_referral_eligible",
        accessToken: session.access_token,
        body: {
          referred_user_id: referredUserId.trim(),
          eligible_at: eligibleAt || undefined,
        },
      });
      setReferredUserId("");
      setEligibleAt("");
      await loadRewards();
    } catch (actionError) {
      setError(actionError.message);
    }
    setBusy(false);
  };

  const approveReward = async (rewardId) => {
    if (!session?.access_token) return;
    setBusy(true);
    setError("");
    try {
      await callEdgeFunction({
        functionName: "admin_approve_referral_reward",
        accessToken: session.access_token,
        body: { reward_id: rewardId },
      });
      await loadRewards();
    } catch (actionError) {
      setError(actionError.message);
    }
    setBusy(false);
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Referral Rewards" subtitle="Manual referral eligibility and reward approval workflow.">
        <div className="tfh-grid tfh-grid-2">
          <div className="tfh-card">
            <h3>Mark referral eligible</h3>
            <form className="tfh-form" onSubmit={markEligible}>
              <div>
                <label>Referred user ID</label>
                <input value={referredUserId} onChange={(e) => setReferredUserId(e.target.value)} />
              </div>
              <div>
                <label>Eligible at (optional)</label>
                <input
                  type="datetime-local"
                  value={eligibleAt}
                  onChange={(e) => setEligibleAt(e.target.value)}
                />
              </div>
              {error && <div className="tfh-alert tfh-error">{error}</div>}
              <div className="tfh-actions">
                <button className="tfh-btn" type="submit" disabled={busy}>
                  Mark eligible
                </button>
              </div>
            </form>
          </div>

          <div className="tfh-card">
            <h3>Reward list</h3>
            {rewards.length ? (
              <div className="tfh-table-wrap">
                <table className="tfh-table">
                  <thead>
                    <tr>
                      <th>Referrer</th>
                      <th>Referred</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Eligible at</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td>{reward.referrer_id}</td>
                        <td>{reward.referred_id}</td>
                        <td>{reward.amount_eur} EUR</td>
                        <td>
                          <StatusBadge status={reward.status} />
                        </td>
                        <td>{reward.eligible_at ? new Date(reward.eligible_at).toLocaleString() : "-"}</td>
                        <td>
                          {reward.status === "pending" ? (
                            <button type="button" className="tfh-btn tfh-btn-outline" onClick={() => approveReward(reward.id)} disabled={busy}>
                              Approve
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No rewards yet.</p>
            )}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminReferralsPage;
