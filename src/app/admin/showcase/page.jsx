"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Divider, Input, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { extractYouTubeVideoId, toYouTubeThumbnailUrl } from "@library/youtube";
import { apiDelete, apiGet, apiPatch, apiPost } from "@library/apiClient";

const AdminShowcasePage = () => {
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
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

    const videoId = extractYouTubeVideoId(trimmedUrl);
    if (!videoId) {
      setError("Unesite validan YouTube link.");
      return;
    }

    setBusy(true);

    try {
      await apiPost("/api/admin/showcase", {
        title: trimmedTitle,
        youtube_url: trimmedUrl,
        youtube_video_id: videoId,
        thumbnail_url: toYouTubeThumbnailUrl(videoId),
        order_index: Number(orderIndex || 0),
        is_active: isActive,
      });

      setTitle("");
      setYoutubeUrl("");
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
    window.open(video.youtube_url || video.youtubeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Showcase klipovi kandidata" subtitle="Upravljanje klipovima koji su prikazani na javnim stranicama.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Dodaj YouTube klip</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="flex flex-col gap-3" onSubmit={createVideo}>
                <Input
                  label="Naziv klipa"
                  value={title}
                  onValueChange={setTitle}
                  variant="bordered"
                  placeholder="Prihvacen kandidat - intro primer"
                  isRequired
                />

                <Input
                  label="YouTube URL"
                  value={youtubeUrl}
                  onValueChange={setYoutubeUrl}
                  variant="bordered"
                  placeholder="https://www.youtube.com/shorts/... or https://www.youtube.com/watch?v=..."
                  isRequired
                />

                <Input
                  type="number"
                  label="Redosled"
                  value={String(orderIndex)}
                  onValueChange={(value) => setOrderIndex(Number(value || 0))}
                  variant="bordered"
                />

                <Checkbox isSelected={isActive} onValueChange={setIsActive}>
                  Aktivan
                </Checkbox>

                <Button color="primary" type="submit" isLoading={busy} className="tfh-action-btn">
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
                        <span>{video.is_active || video.isActive ? "aktivan" : "neaktivan"}</span>
                      </div>
                      <p>Redosled: {video.order_index || video.orderIndex}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="bordered" onPress={() => previewVideo(video)}>
                          Pregled
                        </Button>
                        <Button size="sm" variant="flat" color="warning" onPress={() => toggleActive(video)}>
                          Promeni status
                        </Button>
                        <Button size="sm" variant="flat" color="danger" onPress={() => deleteVideo(video)}>
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
