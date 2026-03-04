"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
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
      setError(loadError.message || "Neuspesno ucitavanje nagrada.");
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
      setError("Polje referred_user_id je obavezno.");
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
      setError(actionError.message || "Oznacavanje kao eligible nije uspelo.");
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
      setError(actionError.message || "Odobravanje nagrade nije uspelo.");
    }

    setBusy(false);
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Referral nagrade" subtitle="Rucno oznacavanje eligible statusa i odobravanje nagrada.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Oznaci referral kao eligible</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="tfh-admin-modern-form" onSubmit={markEligible}>
                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Referred user ID</span>
                  <input
                    className="tfh-admin-modern-input"
                    placeholder="google:123456789"
                    value={referredUserId}
                    onChange={(event) => setReferredUserId(event.target.value)}
                  />
                </label>
                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Eligible datum (opciono)</span>
                  <input
                    type="datetime-local"
                    className="tfh-admin-modern-input"
                    value={eligibleAt}
                    onChange={(event) => setEligibleAt(event.target.value)}
                  />
                </label>

                <Button color="primary" type="submit" isLoading={busy} className="tfh-action-grid-btn">
                  Oznaci kao eligible
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Lista nagrada</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner size="sm" />
                  <p>Ucitavanje nagrada...</p>
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
                        Eligible datum: {(reward.eligibleAt || reward.eligible_at) ? new Date(reward.eligibleAt || reward.eligible_at).toLocaleString() : "-"}
                      </p>
                      {reward.status === "pending" && (
                        <Button size="sm" color="success" variant="flat" onPress={() => approveReward(reward.id)} isLoading={busy}>
                          Odobri
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p>Jos nema nagrada.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminReferralsPage;
