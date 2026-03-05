"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { getFileExt } from "@library/storage";
import { trackEvent, getAnalyticsSessionId } from "@library/analytics";
import { ALLOWED_PHASE1_AUDIO_MIME_TYPES, PHASE1_MAX_AUDIO_MB, bytesFromMb } from "@config/uploadLimits";
import { apiGet, apiPost } from "@library/apiClient";

const TeacherPhase1Page = () => {
  const { user, profile, refreshAuthState } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "");
  const [shortAbout, setShortAbout] = useState(profile?.short_about || "");
  const [scriptText, setScriptText] = useState("Zdravo, moje ime je ...");
  const [audioFile, setAudioFile] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAttempts = async () => {
    setLoading(true);
    try {
      const payload = await apiGet("/api/teacher/phase1");
      setAttempts(payload.attempts || []);
    } catch (loadError) {
      setError(loadError?.message || "Neuspesno ucitavanje pokusaja za fazu 1.");
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFirstName(profile?.first_name || "");
    setLastName(profile?.last_name || "");
    setPhone(profile?.phone || "");
    setDateOfBirth(profile?.date_of_birth || "");
    setShortAbout(profile?.short_about || "");
  }, [profile]);

  useEffect(() => {
    loadAttempts();
  }, [user?.id]);

  const latest = useMemo(() => attempts[attempts.length - 1] || null, [attempts]);
  const attemptsLeft = Math.max(0, 3 - attempts.length);
  const canSubmit = !busy && attemptsLeft > 0 && latest?.status !== "pending" && latest?.status !== "moved_to_phase2";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Nedostaje aktivna korisnicka sesija.");
      return;
    }
    if (!audioFile) {
      setError("Postavite glasovnu poruku za fazu 1 pre slanja.");
      return;
    }
    if (audioFile.size > bytesFromMb(PHASE1_MAX_AUDIO_MB)) {
      setError(`Fajl je prevelik. Maksimalna veličina je ${PHASE1_MAX_AUDIO_MB}MB.`);
      return;
    }
    if (audioFile.type && !ALLOWED_PHASE1_AUDIO_MIME_TYPES.includes(audioFile.type)) {
      setError("Nepodržan audio format. Koristite MP3, M4A, WAV, WEBM ili OGG.");
      return;
    }
    if (shortAbout.length > 50) {
      setError("Kratki opis moze imati najvise 50 karaktera.");
      return;
    }

    setBusy(true);

    const nextAttempt = attempts.length + 1;
    const ext = getFileExt(audioFile.name);
    const pathname = `phase1/${user.id}/phase1-attempt-${nextAttempt}-${Date.now()}.${ext}`;

    try {
      const blob = await upload(pathname, audioFile, {
        access: "public",
        handleUploadUrl: "/api/blob/upload-token",
        clientPayload: JSON.stringify({ kind: "phase1" }),
      });

      await apiPost("/api/teacher/phase1/submit", {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone,
        email: user.email,
        short_about: shortAbout,
        video_blob_key: blob.pathname,
        video_blob_url: blob.url,
        script_text: scriptText,
        session_id: getAnalyticsSessionId(),
      });

      await trackEvent({
        eventName: "phase1_submitted",
        metadata: { attempt_no: nextAttempt },
      });

      setSuccess("Faza 1 je uspesno poslata.");
      setAudioFile(null);
      await refreshAuthState();
      await loadAttempts();
    } catch (submitError) {
      setError(submitError.message || "Slanje faze 1 nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RequireAuth>
      <AppShell title="Faza 1 prijava" subtitle="Unesi podatke i pošalji glasovnu poruku (najviše 3 pokušaja).">
        <div className="tfh-grid">
          <div className="tfh-grid tfh-grid-3">
            <div className="tfh-card">
              <h3>Iskorisceni pokusaji</h3>
              <p>{attempts.length} / 3</p>
            </div>
            <div className="tfh-card">
              <h3>Preostali pokusaji</h3>
              <p>{attemptsLeft}</p>
            </div>
            <div className="tfh-card">
              <h3>Poslednji status</h3>
              <p>{latest ? <StatusBadge status={latest.status} /> : "Jos nema prijave"}</p>
            </div>
          </div>

          {latest?.status === "moved_to_phase2" && (
            <div className="tfh-alert tfh-success">Faza 1 je uspesno prosla. Predji na fazu 2.</div>
          )}

          {latest?.status === "pending" && <div className="tfh-alert">Poslednji pokusaj je na proveri. Sacekajte admin odluku.</div>}

          <div className="tfh-card">
            <h3>Posalji fazu 1</h3>
            <form className="tfh-form" onSubmit={onSubmit}>
              <div className="tfh-grid tfh-grid-2">
                <div>
                  <label>Ime</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div>
                  <label>Prezime</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
                <div>
                  <label>Datum rodjenja</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                </div>
                <div>
                  <label>Telefon</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>

              <div>
                <label>Email (mora biti isti kao Google nalog)</label>
                <input value={user?.email || ""} readOnly />
              </div>
              <div>
                <label>Kratko o meni (max 50)</label>
                <input value={shortAbout} maxLength={50} onChange={(e) => setShortAbout(e.target.value)} required />
              </div>
              <div>
                <label>Tekst za izgovor (4-5 rečenica)</label>
                <textarea value={scriptText} onChange={(e) => setScriptText(e.target.value)} />
                <small>Za fazu 1 sami birate tekst koji izgovarate i unosite ga ovde.</small>
              </div>
              <div>
                <label>Glasovna poruka (audio)</label>
                <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
                <small>Max {PHASE1_MAX_AUDIO_MB}MB (MP3/M4A/WAV/WEBM/OGG)</small>
              </div>

              {error && <div className="tfh-alert tfh-error">{error}</div>}
              {success && <div className="tfh-alert tfh-success">{success}</div>}

              <div className="tfh-actions">
                <button type="submit" className="tfh-btn" disabled={!canSubmit}>
                  {busy ? "Slanje..." : "Pošalji fazu 1"}
                </button>
              </div>
            </form>
          </div>

          <div className="tfh-card">
            <h3>Istorija pokusaja</h3>
            {loading ? (
              <p>Ucitavanje pokusaja...</p>
            ) : attempts.length ? (
              <div className="tfh-mobile-list">
                {attempts.map((row) => (
                  <article key={row.id} className="tfh-mobile-item">
                    <div className="tfh-mobile-item-top">
                      <strong>Pokusaj {row.attempt_no}</strong>
                      <StatusBadge status={row.status} />
                    </div>
                    <p>Razlog odbijanja: {row.reject_reason || "-"}</p>
                    <p>Admin napomena: {row.admin_notes || "-"}</p>
                    <p>{new Date(row.created_at).toLocaleString()}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p>Jos nema pokusaja.</p>
            )}
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase1Page;
