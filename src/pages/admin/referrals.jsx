import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Input, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { getAccessTokenOrThrow } from "@library/auth";
import { callEdgeFunction } from "@library/edgeClient";

const AdminReferralsPage = () => {
  const { supabase } = useAuth();
  const [rewards, setRewards] = useState([]);
  const [referredUserId, setReferredUserId] = useState("");
  const [eligibleAt, setEligibleAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRewards = async () => {
    if (!supabase) return;

    setLoading(true);

    const { data, error: loadError } = await supabase
      .from("referral_rewards")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setRewards([]);
    } else {
      setError("");
      setRewards(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadRewards();
  }, []);

  const markEligible = async (e) => {
    e.preventDefault();

    if (!referredUserId.trim()) {
      setError("referred_user_id is required");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);
      await callEdgeFunction({
        functionName: "admin_mark_referral_eligible",
        accessToken,
        body: {
          referred_user_id: referredUserId.trim(),
          eligible_at: eligibleAt || undefined,
        },
      });

      setReferredUserId("");
      setEligibleAt("");
      await loadRewards();
    } catch (actionError) {
      setError(actionError.message || "Failed to mark eligible.");
    }

    setBusy(false);
  };

  const approveReward = async (rewardId) => {
    setBusy(true);
    setError("");

    try {
      const accessToken = await getAccessTokenOrThrow(supabase);
      await callEdgeFunction({
        functionName: "admin_approve_referral_reward",
        accessToken,
        body: { reward_id: rewardId },
      });

      await loadRewards();
    } catch (actionError) {
      setError(actionError.message || "Failed to approve reward.");
    }

    setBusy(false);
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Referral Rewards" subtitle="Manual referral eligibility and reward approval workflow.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Mark referral eligible</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="flex flex-col gap-3" onSubmit={markEligible}>
                <Input
                  label="Referred user ID"
                  placeholder="UUID"
                  value={referredUserId}
                  onValueChange={setReferredUserId}
                  variant="bordered"
                />
                <Input
                  type="datetime-local"
                  label="Eligible at (optional)"
                  value={eligibleAt}
                  onValueChange={setEligibleAt}
                  variant="bordered"
                />

                <Button color="primary" type="submit" isLoading={busy}>
                  Mark eligible
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Reward list</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner size="sm" />
                  <p>Loading rewards...</p>
                </div>
              ) : rewards.length ? (
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
                              <Button
                                size="sm"
                                color="success"
                                variant="flat"
                                onPress={() => approveReward(reward.id)}
                                isLoading={busy}
                              >
                                Approve
                              </Button>
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
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminReferralsPage;