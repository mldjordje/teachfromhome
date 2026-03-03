import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Divider, Input, Select, SelectItem, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { getFileExt } from "@library/storage";

const categoryOptions = [
  { key: "about_us", label: "about_us" },
  { key: "bright_sample", label: "bright_sample" },
  { key: "tips", label: "tips" },
];

const AdminTrainingVideosPage = () => {
  const { supabase, user } = useAuth();
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
    if (!supabase) return;

    setLoading(true);

    const { data, error: loadError } = await supabase
      .from("training_videos")
      .select("*")
      .order("category", { ascending: true })
      .order("order_index", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      setVideos([]);
    } else {
      setError("");
      setVideos(data ?? []);
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

    const ext = getFileExt(videoFile.name);
    const storagePath = `${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("training-videos").upload(storagePath, videoFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: videoFile.type || "video/mp4",
    });

    if (uploadError) {
      setBusy(false);
      setError(uploadError.message);
      return;
    }

    const { error: insertError } = await supabase.from("training_videos").insert({
      title,
      category,
      order_index: Number(orderIndex),
      storage_path: storagePath,
      is_active: isActive,
      created_by: user.id,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setCategory("about_us");
    setOrderIndex(0);
    setIsActive(true);
    setVideoFile(null);
    await loadVideos();
  };

  const toggleActive = async (video) => {
    await supabase.from("training_videos").update({ is_active: !video.is_active }).eq("id", video.id);
    await loadVideos();
  };

  const deleteVideo = async (video) => {
    const { error: storageError } = await supabase.storage.from("training-videos").remove([video.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }

    await supabase.from("training_videos").delete().eq("id", video.id);
    await loadVideos();
  };

  const getPreviewUrl = async (path) => {
    const { data } = await supabase.storage.from("training-videos").createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
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

                <Input
                  type="file"
                  label="Video file"
                  accept="video/*"
                  variant="bordered"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                />

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
                <div className="tfh-table-wrap">
                  <table className="tfh-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Order</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((video) => (
                        <tr key={video.id}>
                          <td>{video.title}</td>
                          <td>{video.category}</td>
                          <td>{video.order_index}</td>
                          <td>{video.is_active ? "yes" : "no"}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="bordered" onPress={() => getPreviewUrl(video.storage_path)}>
                                Preview
                              </Button>
                              <Button size="sm" variant="flat" color="warning" onPress={() => toggleActive(video)}>
                                Toggle
                              </Button>
                              <Button size="sm" variant="flat" color="danger" onPress={() => deleteVideo(video)}>
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
