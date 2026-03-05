"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@heroui/react";
import { apiGet } from "@library/apiClient";
import { extractYouTubeVideoId, toYouTubeEmbedUrl } from "@library/youtube";

const ShowcaseVideoGrid = ({ limit = 0, compact = false }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const query = limit > 0 ? `?limit=${limit}` : "";
        const payload = await apiGet(`/api/public/showcase${query}`);
        const data = payload?.rows || [];

        const normalized = (data ?? [])
          .map((row) => {
            const youtubeVideoId = row.youtube_video_id || row.youtubeVideoId || null;
            const youtubeUrl = row.youtube_url || row.youtubeUrl || null;
            const videoId = youtubeVideoId || extractYouTubeVideoId(youtubeUrl);
            const embedUrl = toYouTubeEmbedUrl(videoId);
            if (!videoId || !embedUrl) return null;
            return {
              ...row,
              title: row.title || "Showcase klip",
              videoId,
              embedUrl,
            };
          })
          .filter(Boolean);

        if (!alive) return;
        setVideos(normalized);
        setError("");
      } catch (loadErr) {
        if (!alive) return;
        setError(loadErr?.message || "Neuspesno ucitavanje showcase klipova.");
        setVideos([]);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="tfh-showcase-loading">
        <Spinner size="sm" />
        <span>Ucitavanje klipova...</span>
      </div>
    );
  }

  if (error) {
    return <p className="tfh-showcase-error">{error}</p>;
  }

  if (!videos.length) {
    return <p className="tfh-showcase-empty">Trenutno nema dostupnih klipova.</p>;
  }

  return (
    <div className={`tfh-showcase-grid ${compact ? "tfh-showcase-grid--compact" : ""}`}>
      {videos.map((video) => (
        <article key={video.id} className="tfh-showcase-card">
          <div className="tfh-showcase-frame-wrap">
            <iframe
              src={video.embedUrl}
              title={video.title}
              className="tfh-showcase-frame"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <h3>{video.title}</h3>
        </article>
      ))}
    </div>
  );
};

export default ShowcaseVideoGrid;
