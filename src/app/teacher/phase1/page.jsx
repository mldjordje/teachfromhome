"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import StatusBadge from "@components/app/StatusBadge";
import { useAuth } from "@components/auth/AuthProvider";
import { getFileExt } from "@library/storage";
import { trackEvent, getAnalyticsSessionId } from "@library/analytics";
import { ALLOWED_PHASE1_AUDIO_MIME_TYPES, PHASE1_MAX_AUDIO_MB, bytesFromMb } from "@config/uploadLimits";
import { PHASE1_SHARED_SCRIPT_TEXT } from "@config/phaseTexts";
import { apiGet, apiPost } from "@library/apiClient";

const RECORDER_MIME_TYPE_CANDIDATES = ["audio/webm", "audio/ogg", "audio/mp4"];

const FILE_EXTENSION_BY_MIME = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
};

const normalizeMimeType = (mimeType = "") => String(mimeType).toLowerCase().split(";")[0].trim();
const formatFileSize = (size = 0) => `${(Number(size || 0) / (1024 * 1024)).toFixed(2)}MB`;

const PHASE1_AUDIO_MIME_ALIASES = {
  "video/webm": "audio/webm",
  "video/ogg": "audio/ogg",
  "video/mp4": "audio/mp4",
};

const normalizePhase1AudioMimeType = (mimeType = "") => {
  const normalized = normalizeMimeType(mimeType);
  return PHASE1_AUDIO_MIME_ALIASES[normalized] || normalized;
};

const isAllowedAudioMimeType = (mimeType = "") => {
  const normalized = normalizePhase1AudioMimeType(mimeType);
  if (!normalized) return true;
  return ALLOWED_PHASE1_AUDIO_MIME_TYPES.includes(normalized);
};

const supportsAudioRecording = () =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const TeacherPhase1Page = () => {
  const { user, profile, refreshAuthState } = useAuth();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || "");
  const [shortAbout, setShortAbout] = useState(profile?.short_about || "");
  const [audioSource, setAudioSource] = useState("upload");
  const [audioFile, setAudioFile] = useState(null);
  const [recorderSupported, setRecorderSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordedAudioUrlRef = useRef("");

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

  useEffect(() => {
    setRecorderSupported(supportsAudioRecording());
  }, []);

  useEffect(
    () => () => {
      const activeRecorder = recorderRef.current;
      if (activeRecorder && activeRecorder.state !== "inactive") {
        activeRecorder.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordedAudioUrlRef.current) {
        URL.revokeObjectURL(recordedAudioUrlRef.current);
      }
    },
    [],
  );

  const latest = useMemo(() => attempts[attempts.length - 1] || null, [attempts]);
  const attemptsLeft = Math.max(0, 3 - attempts.length);
  const hasAudioToSubmit = audioSource === "record" ? Boolean(recordedAudioBlob) : Boolean(audioFile);
  const canSubmit = !busy && !isRecording && hasAudioToSubmit && attemptsLeft > 0 && latest?.status !== "pending" && latest?.status !== "moved_to_phase2";

  const stopActiveStream = () => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const setRecordedAudioPreview = (blob) => {
    if (recordedAudioUrlRef.current) {
      URL.revokeObjectURL(recordedAudioUrlRef.current);
      recordedAudioUrlRef.current = "";
    }
    if (!blob) {
      setRecordedAudioUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(blob);
    recordedAudioUrlRef.current = nextUrl;
    setRecordedAudioUrl(nextUrl);
  };

  const clearRecordedAudio = () => {
    setRecordedAudioBlob(null);
    setRecordedAudioPreview(null);
  };

  const getRecorderMimeType = () => {
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      return "";
    }
    const hasIsTypeSupported = typeof window.MediaRecorder.isTypeSupported === "function";
    if (!hasIsTypeSupported) return "";
    for (const candidate of RECORDER_MIME_TYPE_CANDIDATES) {
      if (window.MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }
    return "";
  };

  const startRecording = async () => {
    if (!recorderSupported) {
      setError("Vas browser ne podrzava direktno snimanje zvuka. Koristite upload.");
      return;
    }
    if (isRecording) return;

    setError("");
    setSuccess("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      clearRecordedAudio();
      setAudioFile(null);

      const preferredMimeType = getRecorderMimeType();
      const recorder = preferredMimeType ? new window.MediaRecorder(stream, { mimeType: preferredMimeType }) : new window.MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsRecording(false);
        stopActiveStream();
        recorderRef.current = null;
        chunksRef.current = [];
        setError("Snimanje nije uspelo. Pokusajte ponovo.");
      };

      recorder.onstop = () => {
        setIsRecording(false);
        stopActiveStream();
        recorderRef.current = null;

        const chunks = chunksRef.current;
        chunksRef.current = [];
        if (!chunks.length) {
          setError("Nema snimljenog zvuka. Pokusajte ponovo.");
          return;
        }

        const detectedMimeType = normalizePhase1AudioMimeType(recorder.mimeType || chunks[0]?.type || "audio/webm");
        const blob = new Blob(chunks, { type: detectedMimeType || "audio/webm" });
        setRecordedAudioBlob(blob);
        setRecordedAudioPreview(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (_recordError) {
      setIsRecording(false);
      stopActiveStream();
      recorderRef.current = null;
      setError("Mikrofon nije dostupan. Omogucite dozvolu za mikrofon i pokusajte ponovo.");
    }
  };

  const stopRecording = () => {
    const activeRecorder = recorderRef.current;
    if (!activeRecorder || activeRecorder.state === "inactive") return;
    activeRecorder.stop();
  };

  const onAudioSourceChange = (nextSource) => {
    setAudioSource(nextSource);
    setError("");
    setSuccess("");
    if (nextSource === "upload") {
      if (isRecording) stopRecording();
      return;
    }
    setAudioFile(null);
  };

  const buildRecordedAudioFile = () => {
    if (!recordedAudioBlob) return null;
    const normalizedMimeType = normalizePhase1AudioMimeType(recordedAudioBlob.type || "audio/webm");
    const extension = FILE_EXTENSION_BY_MIME[normalizedMimeType] || "webm";
    return new File([recordedAudioBlob], `phase1-recording-${Date.now()}.${extension}`, { type: normalizedMimeType || "audio/webm" });
  };

  const goToStep2 = () => {
    setError("");
    if (!firstName.trim()) { setError("Unesi ime."); return; }
    if (!lastName.trim()) { setError("Unesi prezime."); return; }
    if (!dateOfBirth) { setError("Unesi datum rodjenja."); return; }
    if (!phone.trim()) { setError("Unesi broj telefona."); return; }
    if (!shortAbout.trim()) { setError("Unesi kratki opis."); return; }
    if (shortAbout.length > 50) { setError("Kratki opis moze imati najvise 50 karaktera."); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      setError("Nedostaje aktivna korisnicka sesija.");
      return;
    }

    const selectedAudioFileRaw = audioSource === "record" ? buildRecordedAudioFile() : audioFile;
    if (!selectedAudioFileRaw) {
      setError(audioSource === "record" ? "Prvo snimite glasovnu poruku pa zatim posaljite." : "Postavite glasovnu poruku za fazu 1 pre slanja.");
      return;
    }
    const normalizedAudioMimeType = normalizePhase1AudioMimeType(selectedAudioFileRaw.type || "");
    const selectedAudioFile =
      normalizedAudioMimeType && normalizedAudioMimeType !== selectedAudioFileRaw.type
        ? new File([selectedAudioFileRaw], selectedAudioFileRaw.name, { type: normalizedAudioMimeType })
        : selectedAudioFileRaw;
    if (selectedAudioFile.size > bytesFromMb(PHASE1_MAX_AUDIO_MB)) {
      setError(`Fajl je prevelik. Maksimalna velicina je ${PHASE1_MAX_AUDIO_MB}MB.`);
      return;
    }
    if (selectedAudioFile.type && !isAllowedAudioMimeType(selectedAudioFile.type)) {
      setError("Nepodrzan audio format. Koristite MP3, M4A, WAV, WEBM ili OGG.");
      return;
    }

    setBusy(true);

    const nextAttempt = attempts.length + 1;
    const ext = getFileExt(selectedAudioFile.name);
    const pathname = `phase1/${user.id}/phase1-attempt-${nextAttempt}-${Date.now()}.${ext}`;

    try {
      const blob = await upload(pathname, selectedAudioFile, {
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
        script_text: PHASE1_SHARED_SCRIPT_TEXT,
        session_id: getAnalyticsSessionId(),
      });

      await trackEvent({
        eventName: "phase1_submitted",
        metadata: { attempt_no: nextAttempt },
      });

      setSuccess("Faza 1 je uspesno poslata. Sacekaj admin pregled.");
      setAudioFile(null);
      clearRecordedAudio();
      await refreshAuthState();
      await loadAttempts();
    } catch (submitError) {
      setError(submitError.message || "Slanje faze 1 nije uspelo.");
    } finally {
      setBusy(false);
    }
  };

  const isBlocked = latest?.status === "moved_to_phase2" || latest?.status === "pending";

  return (
    <RequireAuth>
      <AppShell title="Faza 1" subtitle="Audio prijava u dva koraka.">
        <div className="tfh-phase1-shell">

          {/* Step progress bar */}
          <div className="tfh-step-bar">
            <div className={`tfh-step-node${step === 1 ? " is-current" : " is-done"}`}>
              <span>{step > 1 ? "✓" : "1"}</span>
              <p>Podaci</p>
            </div>
            <div className="tfh-step-track" />
            <div className={`tfh-step-node${step === 2 ? " is-current" : ""}`}>
              <span>2</span>
              <p>Audio</p>
            </div>
          </div>

          {/* Status alerts */}
          {latest?.status === "moved_to_phase2" && (
            <div className="tfh-alert tfh-success">Faza 1 je uspesno prosla. HR tim ce te kontaktirati sa narednim koracima.</div>
          )}
          {latest?.status === "pending" && (
            <div className="tfh-alert">Poslednji pokusaj je na proveri. Sacekajte admin odluku.</div>
          )}

          <form onSubmit={onSubmit}>
            {/* ── Step 1: Profile data ── */}
            {step === 1 && (
              <div className="tfh-card tfh-step-card">
                <div className="tfh-step-card-header">
                  <h3>Tvoji podaci</h3>
                  <p>Popuni osnovne podatke — potrebni su nam za kontakt.</p>
                </div>
                <div className="tfh-form">
                  <div className="tfh-grid tfh-grid-2">
                    <div>
                      <label>Ime</label>
                      <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ime" />
                    </div>
                    <div>
                      <label>Prezime</label>
                      <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Prezime" />
                    </div>
                    <div>
                      <label>Datum rodjenja</label>
                      <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                    </div>
                    <div>
                      <label>Telefon</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+381..." />
                    </div>
                  </div>
                  <div>
                    <label>Email</label>
                    <input value={user?.email || ""} readOnly />
                  </div>
                  <div>
                    <label>
                      Kratko o meni
                      <small className="tfh-char-count">{shortAbout.length}/50</small>
                    </label>
                    <input
                      value={shortAbout}
                      maxLength={50}
                      onChange={(e) => setShortAbout(e.target.value)}
                      placeholder="Npr: Predajem matematiku 5 godina."
                    />
                  </div>
                  {error && <div className="tfh-alert tfh-error">{error}</div>}
                  <div className="tfh-actions">
                    <button type="button" className="tfh-btn tfh-btn--full" onClick={goToStep2} disabled={isBlocked}>
                      Dalje — korak 2 od 2
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Audio ── */}
            {step === 2 && (
              <div className="tfh-card tfh-step-card">
                <div className="tfh-step-card-header">
                  <button type="button" className="tfh-step-back" onClick={() => { setStep(1); setError(""); setSuccess(""); }}>
                    ← Nazad
                  </button>
                  <h3>Snimi glasovnu poruku</h3>
                  <p>Procitaj tekst ispod glasno i jasno, pa posalji.</p>
                </div>

                {/* Script text — prominent */}
                <div className="tfh-script-display">
                  <div className="tfh-script-label">Tekst za citanje</div>
                  <p className="tfh-script-text">{PHASE1_SHARED_SCRIPT_TEXT}</p>
                </div>

                <div className="tfh-form">
                  {/* Audio source toggle */}
                  <div className="tfh-audio-source-toggle">
                    <button
                      type="button"
                      className={`tfh-source-option${audioSource === "upload" ? " is-active" : ""}`}
                      onClick={() => onAudioSourceChange("upload")}
                      disabled={busy}
                    >
                      Upload fajla
                    </button>
                    <button
                      type="button"
                      className={`tfh-source-option${audioSource === "record" ? " is-active" : ""}`}
                      onClick={() => onAudioSourceChange("record")}
                      disabled={busy || !recorderSupported}
                    >
                      Snimi direktno
                    </button>
                  </div>

                  {audioSource === "upload" ? (
                    <div className="tfh-record-box">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          setAudioFile(e.target.files?.[0] || null);
                          setError("");
                          setSuccess("");
                        }}
                      />
                      <small>Max {PHASE1_MAX_AUDIO_MB}MB · MP3 / M4A / WAV / WEBM / OGG</small>
                      {audioFile && (
                        <div className="tfh-audio-ready">
                          ✓ {audioFile.name} ({formatFileSize(audioFile.size)})
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="tfh-record-box">
                      {!recorderSupported ? (
                        <div className="tfh-alert">Tvoj browser ne podrzava snimanje. Koristi upload opciju.</div>
                      ) : (
                        <div className="tfh-actions">
                          {!isRecording ? (
                            <button type="button" className="tfh-btn tfh-btn--record" onClick={startRecording} disabled={busy}>
                              Pocni snimanje
                            </button>
                          ) : (
                            <button type="button" className="tfh-btn tfh-btn--stop" onClick={stopRecording} disabled={busy}>
                              Zaustavi snimanje
                            </button>
                          )}
                          {recordedAudioBlob && !isRecording && (
                            <button type="button" className="tfh-btn tfh-btn-outline tfh-btn--sm" onClick={clearRecordedAudio} disabled={busy}>
                              Obrisi
                            </button>
                          )}
                        </div>
                      )}
                      {isRecording && (
                        <div className="tfh-recording-live">
                          <span className="tfh-recording-dot" />
                          Snimanje u toku...
                        </div>
                      )}
                      {recordedAudioUrl && (
                        <audio className="tfh-record-preview" controls preload="metadata" src={recordedAudioUrl} />
                      )}
                    </div>
                  )}

                  {/* Submission readiness */}
                  <div className="tfh-submit-status">
                    {canSubmit ? (
                      <span className="tfh-submit-ready">✓ Sve je spremno za slanje</span>
                    ) : (
                      <span className="tfh-submit-waiting">
                        {latest?.status === "pending"
                          ? "Ceka se admin odluka..."
                          : latest?.status === "moved_to_phase2"
                          ? "Vec si prosao Fazu 1."
                          : attemptsLeft === 0
                          ? "Nemas vise pokusaja."
                          : "Dodaj ili snimi audio pre slanja."}
                      </span>
                    )}
                  </div>

                  {error && <div className="tfh-alert tfh-error">{error}</div>}
                  {success && <div className="tfh-alert tfh-success">{success}</div>}

                  <div className="tfh-actions">
                    <button type="submit" className="tfh-btn tfh-btn--full" disabled={!canSubmit}>
                      {busy ? "Slanje..." : "Posalji prijavu"}
                    </button>
                  </div>

                  {attemptsLeft > 0 && !isBlocked && (
                    <p className="tfh-attempts-info">Preostalo pokusaja: {attemptsLeft} od 3</p>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* Attempt history — only when there are actual attempts */}
          {attempts.length > 0 && (
            <div className="tfh-card">
              <h3>Istorija pokusaja</h3>
              {loading ? (
                <p>Ucitavanje...</p>
              ) : (
                <div className="tfh-mobile-list">
                  {attempts.map((row) => (
                    <article key={row.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>Pokusaj {row.attempt_no}</strong>
                        <StatusBadge status={row.status} />
                      </div>
                      {row.reject_reason && <p>Razlog: {row.reject_reason}</p>}
                      {row.admin_notes && <p>Napomena: {row.admin_notes}</p>}
                      <p>{new Date(row.created_at).toLocaleString()}</p>
                      {row.video_blob_url ? (
                        <audio className="tfh-record-preview" controls preload="metadata" src={row.video_blob_url} />
                      ) : (
                        <p>Snimak trenutno nije dostupan.</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase1Page;
