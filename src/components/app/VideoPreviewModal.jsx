"use client";

import { useEffect } from "react";

const AUDIO_EXT_RE = /\.(mp3|m4a|wav|ogg|aac|flac)(?:$|\?)/i;

const isAudioSource = (src = "") => {
  const normalized = String(src).toLowerCase();
  return normalized.includes("/phase1/") || AUDIO_EXT_RE.test(normalized);
};

const VideoPreviewModal = ({ open, src, title = "Pregled klipa", onClose }) => {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !src) return null;

  const audioOnly = isAudioSource(src);

  return (
    <div className="tfh-video-modal" role="dialog" aria-modal="true" onClick={() => onClose?.()}>
      <div className="tfh-video-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="tfh-video-modal-head">
          <strong>{title}</strong>
          <button type="button" className="tfh-video-modal-close" onClick={() => onClose?.()}>
            Zatvori
          </button>
        </div>
        {audioOnly ? (
          <div className="tfh-audio-player-wrap">
            <audio className="tfh-audio-player" src={src} controls preload="metadata" />
          </div>
        ) : (
          <video className="tfh-video-player" src={src} controls playsInline preload="metadata" />
        )}
      </div>
    </div>
  );
};

export default VideoPreviewModal;
