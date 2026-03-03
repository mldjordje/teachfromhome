const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export const extractYouTubeVideoId = (input) => {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  if (YOUTUBE_ID_RE.test(raw)) {
    return raw;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = parsed.pathname.split("/").filter(Boolean)[0];
    return id && YOUTUBE_ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id && YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
      const id = parsed.pathname.split("/").filter(Boolean)[1];
      return id && YOUTUBE_ID_RE.test(id) ? id : null;
    }
  }

  return null;
};

export const toYouTubeEmbedUrl = (videoId) => {
  if (!videoId || !YOUTUBE_ID_RE.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
};

export const toYouTubeThumbnailUrl = (videoId) => {
  if (!videoId || !YOUTUBE_ID_RE.test(videoId)) return null;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
};
