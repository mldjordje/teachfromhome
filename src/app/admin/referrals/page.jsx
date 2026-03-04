"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Input, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { apiGet, apiPost } from "@library/apiClient";

const AdminReferralsPage = () => {
  const [rewards, setRewards] = useState([]);
  const [referredUserId, setReferredUserId] = useState("");
  const [eligibleAt, setEligibleAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRewards = async () => {
    setLoading(true);

    try {
      const payload = await apiGet("/api/admin/referrals");
      setError("");
      setRewards(payload.rows || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load rewards");
      setRewards([]);
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
      await apiPost("/api/referrals/mark-eligible", {
        referred_user_id: referredUserId.trim(),
        eligible_at: eligibleAt || undefined,
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
      await apiPost("/api/referrals/approve", { reward_id: rewardId });

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
          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Mark referral eligible</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="flex flex-col gap-3" onSubmit={markEligible}>
                <Input
                  label="Referred user ID"
                  placeholder="google:123456789"
                  value={referredUserId}
                  onValueChange={setReferredUserId}
                  variant="bordered"
                />
                <Input type="datetime-local" label="Eligible at (optional)" value={eligibleAt} onValueChange={setEligibleAt} variant="bordered" />

                <Button color="primary" type="submit" isLoading={busy}>
                  Mark eligible
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="tfh-admin-panel-card">
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
                <div className="tfh-mobile-list">
                  {rewards.map((reward) => (
                    <article key={reward.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>{reward.amountEur || reward.amount_eur} EUR</strong>
                        <StatusBadge status={reward.status} />
                      </div>
                      <p>Referrer: {reward.referrerId || reward.referrer_id}</p>
                      <p>Referred: {reward.referredId || reward.referred_id}</p>
                      <p>
                        Eligible at: {(reward.eligibleAt || reward.eligible_at) ? new Date(reward.eligibleAt || reward.eligible_at).toLocaleString() : "-"}
                      </p>
                      {reward.status === "pending" && (
                        <Button size="sm" color="success" variant="flat" onPress={() => approveReward(reward.id)} isLoading={busy}>
                          Approve
                        </Button>
                      )}
                    </article>
                  ))}
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
