"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Divider, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { getFileExt } from "@library/storage";
import { apiDelete, apiGet, apiPatch, apiPost } from "@library/apiClient";

const categoryOptions = [
  { key: "about_us", label: "about_us" },
  { key: "bright_sample", label: "bright_sample" },
  { key: "tips", label: "tips" },
];

const AdminTrainingVideosPage = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("about_us");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [videoFile, setVideoFile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const payload = await apiGet("/api/admin/training");
      setError("");
      setVideos(payload.rows || []);
    } catch (loadError) {
      setError(loadError.message || "Neuspesno ucitavanje trening klipova.");
      setVideos([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const uploadVideo = async (e) => {
    e.preventDefault();
    setError("");

    if (!videoFile) {
      setError("Izaberi trening video fajl.");
      return;
    }

    setBusy(true);

    try {
      const ext = getFileExt(videoFile.name);
      const pathname = `training/${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const blob = await upload(pathname, videoFile, {
        access: "public",
        handleUploadUrl: "/api/blob/upload-token",
        clientPayload: JSON.stringify({ kind: "training" }),
      });

      await apiPost("/api/admin/training", {
        title,
        category,
        order_index: Number(orderIndex),
        storage_blob_key: blob.pathname,
        storage_blob_url: blob.url,
        is_active: isActive,
      });

      setTitle("");
      setCategory("about_us");
      setOrderIndex(0);
      setIsActive(true);
      setVideoFile(null);
      await loadVideos();
    } catch (uploadError) {
      setError(uploadError.message || "Upload nije uspeo.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (video) => {
    await apiPatch("/api/admin/training", { video_id: video.id });
    await loadVideos();
  };

  const deleteVideo = async (video) => {
    await apiDelete("/api/admin/training", { video_id: video.id });
    await loadVideos();
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Trening klipovi" subtitle="Upload i upravljanje klipovima za Fazu 2.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Upload trening klipa</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="tfh-admin-modern-form" onSubmit={uploadVideo}>
                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Naslov</span>
                  <input
                    className="tfh-admin-modern-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Npr. Intro demonstracija"
                    required
                  />
                </label>

                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Kategorija</span>
                  <select className="tfh-admin-modern-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categoryOptions.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

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

                <label className="tfh-admin-modern-field">
                  <span className="tfh-admin-modern-label">Video fajl</span>
                  <input
                    type="file"
                    className="tfh-admin-modern-file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                </label>

                <Button color="primary" type="submit" isLoading={busy} className="tfh-action-grid-btn">
                  {busy ? "Upload u toku..." : "Upload klipa"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Postojeci trening klipovi</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner size="sm" />
                  <p>Ucitavanje trening klipova...</p>
                </div>
              ) : videos.length ? (
                <div className="tfh-mobile-list">
                  {videos.map((video) => (
                    <article key={video.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>{video.title}</strong>
                        <span className={video.is_active ? "tfh-state-pill tfh-state-pill--ok" : "tfh-state-pill"}>
                          {video.is_active ? "aktivan" : "neaktivan"}
                        </span>
                      </div>
                      <p>Kategorija: {video.category}</p>
                      <p>Redosled: {video.order_index}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" as="a" href={video.storage_blob_url} target="_blank" rel="noreferrer" variant="bordered">Pregled</Button>
                        <Button size="sm" variant="flat" color="warning" onPress={() => toggleActive(video)}>Promeni status</Button>
                        <Button size="sm" variant="flat" color="danger" onPress={() => deleteVideo(video)}>Obrisi</Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>Nema trening klipova. Dodaj prvi klip kroz formu levo.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminTrainingVideosPage;
