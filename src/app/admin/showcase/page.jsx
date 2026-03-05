"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { getFileExt } from "@library/storage";
import { extractYouTubeVideoId, toYouTubeThumbnailUrl } from "@library/youtube";
import { apiDelete, apiGet, apiPatch, apiPost } from "@library/apiClient";

const AdminShowcasePage = () => {
  const [title, setTitle] = useState("");
  const [sourceMode, setSourceMode] = useState("native");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const payload = await apiGet("/api/admin/showcase");
      setError("");
      setVideos(payload.rows || []);
    } catch (loadError) {
      setError(loadError.message || "Neuspesno ucitavanje showcase klipova.");
      setVideos([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const createVideo = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    const trimmedUrl = youtubeUrl.trim();

    if (!trimmedTitle) {
      setError("Naslov je obavezan.");
      return;
    }

    setBusy(true);

    try {
      if (sourceMode === "native") {
        if (!videoFile) {
          throw new Error("Izaberite video fajl za native showcase.");
        }

        const ext = getFileExt(videoFile.name);
        const pathname = `showcase/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const blob = await upload(pathname, videoFile, {
          access: "public",
          handleUploadUrl: "/api/blob/upload-token",
          clientPayload: JSON.stringify({ kind: "showcase" }),
        });

        await apiPost("/api/admin/showcase", {
          source: "native",
          title: trimmedTitle,
          storage_blob_key: blob.pathname,
          storage_blob_url: blob.url,
          order_index: Number(orderIndex || 0),
          is_active: isActive,
        });
      } else {
        const videoId = extractYouTubeVideoId(trimmedUrl);
        if (!videoId) {
          throw new Error("Unesite validan YouTube link.");
        }

        await apiPost("/api/admin/showcase", {
          source: "youtube",
          title: trimmedTitle,
          youtube_url: trimmedUrl,
          youtube_video_id: videoId,
          thumbnail_url: toYouTubeThumbnailUrl(videoId),
          order_index: Number(orderIndex || 0),
          is_active: isActive,
        });
      }

      setTitle("");
      setYoutubeUrl("");
      setVideoFile(null);
      setOrderIndex(0);
      setIsActive(true);
      await loadVideos();
    } catch (insertError) {
      setError(insertError.message || "Kreiranje showcase stavke nije uspelo.");
    }

    setBusy(false);
  };

  const toggleActive = async (video) => {
    await apiPatch("/api/admin/showcase", { video_id: video.id });
    await loadVideos();
  };

  const deleteVideo = async (video) => {
    await apiDelete("/api/admin/showcase", { video_id: video.id });
    await loadVideos();
  };

  const previewVideo = (video) => {
    const previewUrl =
      video.storage_blob_url ||
      video.storageBlobUrl ||
      video.youtube_url ||
      video.youtubeUrl ||
      "";

    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Showcase klipovi kandidata" subtitle="Native video (bez YouTube brendinga) ili YouTube fallback.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Dodaj showcase klip</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="tfh-admin-modern-form" onSubmit={createVideo}>
                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Naziv klipa</span>
                  <input
                    className="tfh-admin-modern-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Prihvacen kandidat - intro primer"
                    required
                  />
                </label>

                <div className="tfh-admin-source-toggle">
                  <button
                    type="button"
                    className={`tfh-admin-source-btn ${sourceMode === "native" ? "is-active" : ""}`}
                    onClick={() => setSourceMode("native")}
                  >
                    Native video
                  </button>
                  <button
                    type="button"
                    className={`tfh-admin-source-btn ${sourceMode === "youtube" ? "is-active" : ""}`}
                    onClick={() => setSourceMode("youtube")}
                  >
                    YouTube fallback
                  </button>
                </div>

                {sourceMode === "native" ? (
                  <label className="tfh-admin-modern-field">
                    <span className="tfh-admin-modern-label">Video fajl (bez YouTube brendinga)</span>
                    <input
                      type="file"
                      className="tfh-admin-modern-file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                ) : (
                  <label className="tfh-admin-modern-field">
                    <span className="tfh-admin-modern-label">YouTube URL</span>
                    <input
                      className="tfh-admin-modern-input"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </label>
                )}

                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Redosled</span>
                  <input
                    type="number"
                    className="tfh-admin-modern-input"
                    value={String(orderIndex)}
                    onChange={(e) => setOrderIndex(Number(e.target.value || 0))}
                  />
                </label>

                <div className="tfh-admin-toggle-row">
                  <button
                    type="button"
                    className={`tfh-admin-toggle ${isActive ? "is-active" : ""}`}
                    onClick={() => setIsActive((prev) => !prev)}
                    aria-pressed={isActive}
                  >
                    <span className="tfh-admin-toggle-dot" />
                    <span>{isActive ? "Aktivan klip" : "Neaktivan klip"}</span>
                  </button>
                </div>

                <Button color="primary" type="submit" isLoading={busy} className="tfh-action-grid-btn">
                  {busy ? "Cuvanje..." : "Sacuvaj klip"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Postojeci showcase klipovi</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner size="sm" />
                  <p>Ucitavanje klipova...</p>
                </div>
              ) : videos.length ? (
                <div className="tfh-mobile-list">
                  {videos.map((video) => (
                    <article key={video.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>{video.title}</strong>
                        <span className={video.is_active || video.isActive ? "tfh-state-pill tfh-state-pill--ok" : "tfh-state-pill"}>
                          {video.is_active || video.isActive ? "aktivan" : "neaktivan"}
                        </span>
                      </div>
                      <p>Izvor: {video.source || (video.storage_blob_url || video.storageBlobUrl ? "native" : "youtube")}</p>
                      <p>Redosled: {video.order_index || video.orderIndex}</p>
                      <div className="tfh-admin-pagination-actions">
                        <Button size="sm" variant="bordered" onPress={() => previewVideo(video)} className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                          Pregled
                        </Button>
                        <Button size="sm" variant="flat" color="warning" onPress={() => toggleActive(video)} className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                          Promeni status
                        </Button>
                        <Button size="sm" variant="flat" color="danger" onPress={() => deleteVideo(video)} className="tfh-action-grid-btn tfh-action-grid-btn--ghost">
                          Obrisi
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>Trenutno nema showcase klipova.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminShowcasePage;
