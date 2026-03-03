import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { getAccessTokenOrThrow } from "@library/auth";
import { callEdgeFunction } from "@library/edgeClient";

const TeacherProfilePage = () => {
  const { supabase, user, profile, refreshAuthState } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    short_about: "",
  });
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [rewards, setRewards] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRewards = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("referral_rewards")
      .select("*")
      .or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setRewards(data ?? []);
  };

  useEffect(() => {
    setForm({
      first_name: profile?.first_name || "",
      last_name: profile?.last_name || "",
      phone: profile?.phone || "",
      date_of_birth: profile?.date_of_birth || "",
      short_about: profile?.short_about || "",
    });
    loadRewards();
  }, [profile?.user_id]);

  const onField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          date_of_birth: form.date_of_birth || null,
          short_about: form.short_about,
        },
        { onConflict: "user_id" },
      );

    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Profile updated.");
    await refreshAuthState();
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
      const accessToken = await getAccessTokenOrThrow(supabase);
      await callEdgeFunction({
        functionName: "teacher_apply_referral_code",
        accessToken,
        body: { referral_code: referralCodeInput.trim() },
      });
      setSuccess("Referral code applied.");
      setReferralCodeInput("");
      await refreshAuthState();
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
            <p>Your referral code: <strong>{profile?.referral_code || "-"}</strong></p>
            <p>Applied code: <strong>{profile?.referred_by_code || "-"}</strong></p>

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
              <div className="tfh-table-wrap">
                <table className="tfh-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Eligible at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td>{reward.amount_eur} EUR</td>
                        <td>
                          <StatusBadge status={reward.status} />
                        </td>
                        <td>{reward.eligible_at ? new Date(reward.eligible_at).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
