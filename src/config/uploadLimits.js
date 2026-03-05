export const PHASE1_MAX_AUDIO_MB = 25;
export const PHASE2_MAX_VIDEO_MB = 35;

export const ALLOWED_PHASE1_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
];

export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

// Backward compatibility for any legacy imports.
export const PHASE1_MAX_VIDEO_MB = PHASE1_MAX_AUDIO_MB;

export const bytesFromMb = (mb) => mb * 1024 * 1024;
