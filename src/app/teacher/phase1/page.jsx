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

const phase1Checklist = [
  "Popuni osnovne podatke istim emailom kojim si prijavljen/a.",
  "Preslusaj audio pre slanja i proveri da li je glas jasan.",
  "Govori prirodno, bez buke u pozadini i bez zurbe.",
];

const phase1Tips = [
  "Ako si na telefonu, upload gotovog audio fajla je najstabilnija opcija.",
  "Ako browser ne podrzava snimanje, koristi upload umesto record opcije.",
  "Posle slanja status se odmah osvezava na dashboard-u i u istoriji pokusaja.",
];

const TeacherPhase1Page = () => {
  const { user, profile, refreshAuthState } = useAuth();
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
  const selectedAudioMeta = useMemo(() => {
    if (audioSource === "record" && recordedAudioBlob) {
      return {
        label: "Snimljena glasovna poruka",
        size: formatFileSize(recordedAudioBlob.size),
      };
    }

    if (audioFile) {
      return {
        label: audioFile.name,
        size: formatFileSize(audioFile.size),
      };
    }

    return null;
  }, [audioFile, audioSource, recordedAudioBlob]);

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
      if (isRecording) {
        stopRecording();
      }
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
    if (shortAbout.length > 50) {
      setError("Kratki opis moze imati najvise 50 karaktera.");
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

      setSuccess("Faza 1 je uspesno poslata.");
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

  return (
    <RequireAuth>
      <AppShell title="Faza 1" subtitle="Posalji audio prijavu. Maksimalno 3 pokusaja.">
        <div className="tfh-phase1-shell">
          <div className="tfh-phase1-main">
            <div className="tfh-phase1-status-grid">
              <div className="tfh-card tfh-phase1-status-card">
                <span>Iskorisceni pokusaji</span>
                <strong>{attempts.length} / 3</strong>
              </div>
              <div className="tfh-card tfh-phase1-status-card">
                <span>Preostali pokusaji</span>
                <strong>{attemptsLeft}</strong>
              </div>
              <div className="tfh-card tfh-phase1-status-card">
                <span>Poslednji status</span>
                <strong>{latest ? <StatusBadge status={latest.status} /> : "Jos nema prijave"}</strong>
              </div>
            </div>

            {latest?.status === "moved_to_phase2" && (
              <div className="tfh-alert tfh-success">Faza 1 je uspesno prosla. HR tim ce te kontaktirati sa narednim koracima.</div>
            )}

            {latest?.status === "pending" && <div className="tfh-alert">Poslednji pokusaj je na proveri. Sacekajte admin odluku.</div>}

            <div className="tfh-card">
              <h3>Posalji prijavu</h3>
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
                  <label>Email</label>
                  <input value={user?.email || ""} readOnly />
                </div>
                <div>
                  <label>Kratko o meni</label>
                  <input value={shortAbout} maxLength={50} onChange={(e) => setShortAbout(e.target.value)} required />
                </div>
                <div>
                  <label>Tekst za izgovor</label>
                  <textarea value={PHASE1_SHARED_SCRIPT_TEXT} readOnly />
                  <small>Ovaj tekst je isti za sve kandidate.</small>
                </div>
                <div>
                  <label>Audio snimak</label>
                  <div className="tfh-apply-script-block">
                    <span>Brzi vodic</span>
                    <p>1) Izaberi Upload ili Snimi direktno. 2) Preslusaj snimak pre slanja. 3) Klikni Posalji prijavu.</p>
                  </div>
                  <div className="tfh-audio-source-toggle">
                    <button
                      type="button"
                      className={`tfh-source-option ${audioSource === "upload" ? "is-active" : ""}`}
                      onClick={() => onAudioSourceChange("upload")}
                      disabled={busy}
                    >
                      Upload fajla
                    </button>
                    <button
                      type="button"
                      className={`tfh-source-option ${audioSource === "record" ? "is-active" : ""}`}
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
                      <small>Max {PHASE1_MAX_AUDIO_MB}MB (MP3/M4A/WAV/WEBM/OGG)</small>
                      {audioFile && (
                        <small>
                          Izabran fajl: <strong>{audioFile.name}</strong> ({formatFileSize(audioFile.size)})
                        </small>
                      )}
                    </div>
                  ) : (
                    <div className="tfh-record-box">
                      <div className="tfh-actions">
                        {!isRecording ? (
                          <button type="button" className="tfh-btn" onClick={startRecording} disabled={busy || !recorderSupported}>
                            Snimi glasovnu
                          </button>
                        ) : (
                          <button type="button" className="tfh-btn" onClick={stopRecording} disabled={busy}>
                            Zaustavi snimanje
                          </button>
                        )}
                        <button type="button" className="tfh-btn tfh-btn-outline" onClick={clearRecordedAudio} disabled={busy || isRecording || !recordedAudioBlob}>
                          Obrisi snimak
                        </button>
                      </div>
                      {recorderSupported ? (
                        <>
                          {isRecording && <small className="tfh-recording-hint">Snimanje je u toku...</small>}
                          {!isRecording && !recordedAudioBlob && <small>Klikni "Snimi glasovnu", izgovori tekst i klikni "Zaustavi snimanje".</small>}
                        </>
                      ) : (
                        <small>Tvoj browser ne podrzava snimanje zvuka. Koristi opciju upload fajla.</small>
                      )}
                      {recordedAudioUrl && <audio className="tfh-record-preview" controls preload="metadata" src={recordedAudioUrl} />}
                    </div>
                  )}
                </div>

                {error && <div className="tfh-alert tfh-error">{error}</div>}
                {success && <div className="tfh-alert tfh-success">{success}</div>}

                <div className="tfh-actions">
                  <button type="submit" className="tfh-btn" disabled={!canSubmit}>
                    {busy ? "Slanje..." : "Posalji prijavu"}
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
                      {row.video_blob_url ? (
                        <div className="tfh-record-box">
                          <small>Tvoj poslati snimak</small>
                          <audio className="tfh-record-preview" controls preload="metadata" src={row.video_blob_url} />
                        </div>
                      ) : (
                        <p>Snimak trenutno nije dostupan.</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p>Jos nema pokusaja.</p>
              )}
            </div>
          </div>

          <aside className="tfh-phase1-sidebar">
            <div className="tfh-card tfh-phase1-helper-card">
              <h3>Pre slanja proveri</h3>
              <div className="tfh-timeline-list">
                {phase1Checklist.map((item) => (
                  <article key={item} className="tfh-timeline-item">
                    <strong>{item}</strong>
                  </article>
                ))}
              </div>
            </div>

            <div className="tfh-card tfh-phase1-helper-card">
              <h3>Spremnost prijave</h3>
              <div className="tfh-timeline-list">
                <article className="tfh-timeline-item">
                  <strong>Audio</strong>
                  <p>{selectedAudioMeta ? `${selectedAudioMeta.label} (${selectedAudioMeta.size})` : "Jos nije dodat audio fajl."}</p>
                </article>
                <article className="tfh-timeline-item">
                  <strong>Nacin slanja</strong>
                  <p>{audioSource === "record" ? "Snimanje direktno u browseru" : "Upload postojeceg audio fajla"}</p>
                </article>
                <article className="tfh-timeline-item">
                  <strong>Status forme</strong>
                  <p>{canSubmit ? "Spremno za slanje." : "Dodaj audio i proveri obavezna polja."}</p>
                </article>
              </div>
            </div>

            <div className="tfh-card tfh-phase1-helper-card">
              <h3>Prakticni saveti</h3>
              <div className="tfh-timeline-list">
                {phase1Tips.map((item) => (
                  <article key={item} className="tfh-timeline-item">
                    <p>{item}</p>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default TeacherPhase1Page;
