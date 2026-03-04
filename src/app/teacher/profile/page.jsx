"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { apiGet, apiPatch, apiPost } from "@library/apiClient";

const TeacherProfilePage = () => {
  const { user, profile: authProfile, refreshAuthState } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    short_about: "",
  });
  const [profile, setProfile] = useState(authProfile || null);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProfileData = async () => {
    try {
      const payload = await apiGet("/api/teacher/profile");
      const nextProfile = payload.profile || authProfile || null;
      setProfile(nextProfile);
      setForm({
        first_name: nextProfile?.first_name || "",
        last_name: nextProfile?.last_name || "",
        phone: nextProfile?.phone || "",
        date_of_birth: nextProfile?.date_of_birth || "",
        short_about: nextProfile?.short_about || "",
      });
      setRewards(payload.rewards || []);
    } catch (loadError) {
      setError(loadError?.message || "Failed to load profile data");
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [user?.id]);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const payload = await apiPatch("/api/teacher/profile", form);
      setProfile(payload.profile || null);
      setSuccess("Profile updated.");
      await refreshAuthState();
    } catch (updateError) {
      setError(updateError.message || "Failed to update profile");
    }

    setBusy(false);
  };

  const applyReferralCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!referralCodeInput.trim()) {
      setError("Enter referral code first.");
      return;
    }

    setBusy(true);
    try {
      await apiPost("/api/referrals/apply", {
        referral_code: referralCodeInput.trim(),
      });
      setSuccess("Referral code applied.");
      setReferralCodeInput("");
      await refreshAuthState();
      await loadProfileData();
    } catch (applyError) {
      setError(applyError.message || "Failed to apply referral code");
    }
    setBusy(false);
  };

  return (
    <RequireAuth>
      <AppShell title="Profile" subtitle="Manage your teacher profile and referral settings.">
        <div className="tfh-grid tfh-grid-2">
          <div className="tfh-card">
            <h3>Basic profile</h3>
            <form className="tfh-form" onSubmit={saveProfile}>
              <div>
                <label>Email</label>
                <input value={user?.email || ""} readOnly />
              </div>
              <div>
                <label>First name</label>
                <input value={form.first_name} onChange={(e) => onField("first_name", e.target.value)} required />
              </div>
              <div>
                <label>Last name</label>
                <input value={form.last_name} onChange={(e) => onField("last_name", e.target.value)} required />
              </div>
              <div>
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => onField("phone", e.target.value)} />
              </div>
              <div>
                <label>Date of birth</label>
                <input type="date" value={form.date_of_birth || ""} onChange={(e) => onField("date_of_birth", e.target.value)} />
              </div>
              <div>
                <label>Short about (max 50)</label>
                <input maxLength={50} value={form.short_about} onChange={(e) => onField("short_about", e.target.value)} />
              </div>

              {error && <div className="tfh-alert tfh-error">{error}</div>}
              {success && <div className="tfh-alert tfh-success">{success}</div>}

              <div className="tfh-actions">
                <button type="submit" className="tfh-btn" disabled={busy}>
                  Save profile
                </button>
              </div>
            </form>
          </div>

          <div className="tfh-card">
            <h3>Referral</h3>
            <p>
              Your referral code: <strong>{profile?.referral_code || "-"}</strong>
            </p>
            <p>
              Applied code: <strong>{profile?.referred_by_code || "-"}</strong>
            </p>

            <form className="tfh-form" onSubmit={applyReferralCode}>
              <div>
                <label>Apply referral code</label>
                <input value={referralCodeInput} onChange={(e) => setReferralCodeInput(e.target.value)} />
              </div>
              <div className="tfh-actions">
                <button type="submit" className="tfh-btn tfh-btn-outline" disabled={busy}>
                  Apply code
                </button>
              </div>
            </form>

            <h3 style={{ marginTop: "20px" }}>Referral rewards</h3>
            {rewards.length ? (
              <div className="tfh-mobile-list">
                {rewards.map((reward) => (
                  <article key={reward.id} className="tfh-mobile-item">
                    <div className="tfh-mobile-item-top">
                      <strong>{reward.amount_eur || reward.amountEur} EUR</strong>
                      <StatusBadge status={reward.status} />
                    </div>
                    <p>{reward.eligible_at || reward.eligibleAt ? new Date(reward.eligible_at || reward.eligibleAt).toLocaleString() : "-"}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p>No referral rewards yet.</p>
            )}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherProfilePage;
