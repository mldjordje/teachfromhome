import { useEffect, useState } from "react";
import RequireAuth from "@components/auth/RequireAuth";
import AppShell from "@components/app/AppShell";
import { useAuth } from "@components/auth/AuthProvider";
import { getFileExt } from "@library/storage";

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

  const loadVideos = async () => {
    const { data, error: loadError } = await supabase
      .from("training_videos")
      .select("*")
      .order("category", { ascending: true })
      .order("order_index", { ascending: true });
    if (loadError) {
      setError(loadError.message);
      setVideos([]);
      return;
    }
    setError("");
    setVideos(data ?? []);
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
        <div className="tfh-grid tfh-grid-2">
          <div className="tfh-card">
            <h3>Upload training video</h3>
            <form className="tfh-form" onSubmit={uploadVideo}>
              <div>
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="about_us">about_us</option>
                  <option value="bright_sample">bright_sample</option>
                  <option value="tips">tips</option>
                </select>
              </div>
              <div>
                <label>Order index</label>
                <input type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
              </div>
              <div>
                <label>Active</label>
                <select value={isActive ? "yes" : "no"} onChange={(e) => setIsActive(e.target.value === "yes")}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label>Video file</label>
                <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
              </div>
              {error && <div className="tfh-alert tfh-error">{error}</div>}
              <div className="tfh-actions">
                <button className="tfh-btn" type="submit" disabled={busy}>
                  {busy ? "Uploading..." : "Upload video"}
                </button>
              </div>
            </form>
          </div>

          <div className="tfh-card">
            <h3>Existing training videos</h3>
            {videos.length ? (
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
                          <div className="tfh-actions">
                            <button className="tfh-btn tfh-btn-outline" type="button" onClick={() => getPreviewUrl(video.storage_path)}>
                              Preview
                            </button>
                            <button className="tfh-btn tfh-btn-outline" type="button" onClick={() => toggleActive(video)}>
                              Toggle
                            </button>
                            <button className="tfh-btn tfh-btn-outline" type="button" onClick={() => deleteVideo(video)}>
                              Delete
                            </button>
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
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
};

export default AdminTrainingVideosPage;
