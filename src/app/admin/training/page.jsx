"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Divider, Input, Select, SelectItem, Spinner } from "@heroui/react";
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
      setError(loadError.message || "Failed to load videos");
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
      setError("Select training video file.");
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
      setError(uploadError.message || "Upload failed");
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
      <AppShell title="Training Videos" subtitle="Upload and manage Phase 2 training videos.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Upload training video</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="flex flex-col gap-3" onSubmit={uploadVideo}>
                <Input label="Title" value={title} onValueChange={setTitle} variant="bordered" isRequired />

                <Select
                  label="Category"
                  selectedKeys={[category]}
                  onSelectionChange={(keys) => {
                    const next = Array.from(keys)[0];
                    if (typeof next === "string") {
                      setCategory(next);
                    }
                  }}
                  variant="bordered"
                >
                  {categoryOptions.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                <Input
                  type="number"
                  label="Order index"
                  value={String(orderIndex)}
                  onValueChange={(value) => setOrderIndex(Number(value || 0))}
                  variant="bordered"
                />

                <Checkbox isSelected={isActive} onValueChange={setIsActive}>
                  Active
                </Checkbox>

                <Input type="file" label="Video file" accept="video/*" variant="bordered" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />

                <Button color="primary" type="submit" isLoading={busy}>
                  {busy ? "Uploading..." : "Upload video"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card className="tfh-admin-panel-card">
            <CardHeader>
              <h3 className="text-lg font-semibold">Existing training videos</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner size="sm" />
                  <p>Loading training videos...</p>
                </div>
              ) : videos.length ? (
                <div className="tfh-mobile-list">
                  {videos.map((video) => (
                    <article key={video.id} className="tfh-mobile-item">
                      <div className="tfh-mobile-item-top">
                        <strong>{video.title}</strong>
                        <span>{video.is_active ? "active" : "inactive"}</span>
                      </div>
                      <p>Category: {video.category}</p>
                      <p>Order: {video.order_index}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" as="a" href={video.storage_blob_url} target="_blank" rel="noreferrer" variant="bordered">
                          Preview
                        </Button>
                        <Button size="sm" variant="flat" color="warning" onPress={() => toggleActive(video)}>
                          Toggle
                        </Button>
                        <Button size="sm" variant="flat" color="danger" onPress={() => deleteVideo(video)}>
                          Delete
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p>No training videos yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminTrainingVideosPage;
