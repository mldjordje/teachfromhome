import { useEffect, useState } from "react";
import { Alert, Button, Card, CardBody, CardHeader, Checkbox, Divider, Input, Spinner } from "@heroui/react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { extractYouTubeVideoId, toYouTubeThumbnailUrl } from "@library/youtube";

const AdminShowcasePage = () => {
  const { supabase, user } = useAuth();
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadVideos = async () => {
    if (!supabase) return;

    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("showcase_videos")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

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

  const createVideo = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    const trimmedUrl = youtubeUrl.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    const videoId = extractYouTubeVideoId(trimmedUrl);
    if (!videoId) {
      setError("Paste a valid YouTube video/shorts link.");
      return;
    }

    setBusy(true);

    const { error: insertError } = await supabase.from("showcase_videos").insert({
      title: trimmedTitle,
      youtube_url: trimmedUrl,
      youtube_video_id: videoId,
      thumbnail_url: toYouTubeThumbnailUrl(videoId),
      order_index: Number(orderIndex || 0),
      is_active: isActive,
      created_by: user?.id ?? null,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle("");
    setYoutubeUrl("");
    setOrderIndex(0);
    setIsActive(true);
    await loadVideos();
  };

  const toggleActive = async (video) => {
    await supabase.from("showcase_videos").update({ is_active: !video.is_active }).eq("id", video.id);
    await loadVideos();
  };

  const deleteVideo = async (video) => {
    const { error: deleteError } = await supabase.from("showcase_videos").delete().eq("id", video.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await loadVideos();
  };

  const previewVideo = (video) => {
    window.open(video.youtube_url, "_blank", "noopener,noreferrer");
  };

  return (
    <RequireAuth adminOnly>
      <AppShell title="Candidate Showcase Clips" subtitle="Manage accepted candidate clips shown on public pages.">
        {error && <Alert color="danger" title={error} className="mb-4" />}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Add YouTube clip</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              <form className="flex flex-col gap-3" onSubmit={createVideo}>
                <Input
                  label="Clip title"
                  value={title}
                  onValueChange={setTitle}
                  variant="bordered"
                  placeholder="Accepted Candidate - Intro Sample"
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
                  label="Order index"
                  value={String(orderIndex)}
                  onValueChange={(value) => setOrderIndex(Number(value || 0))}
                  variant="bordered"
                />

                <Checkbox isSelected={isActive} onValueChange={setIsActive}>
                  Active
                </Checkbox>

                <Button color="primary" type="submit" isLoading={busy} className="tfh-action-btn">
                  {busy ? "Saving..." : "Save clip"}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Existing showcase clips</h3>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-3 py-6">
                  <Spinner size="sm" />
                  <p>Loading clips...</p>
                </div>
              ) : videos.length ? (
                <div className="tfh-table-wrap">
                  <table className="tfh-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Order</th>
                        <th>Active</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.map((video) => (
                        <tr key={video.id}>
                          <td>{video.title}</td>
                          <td>{video.order_index}</td>
                          <td>{video.is_active ? "yes" : "no"}</td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="bordered" onPress={() => previewVideo(video)}>
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
                <p>No showcase clips yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminShowcasePage;
