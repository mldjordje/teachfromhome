"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const AUDIO_EXT_RE = /\.(mp3|m4a|wav|ogg|aac|flac)(?:$|\?)/i;

const isAudioSource = (src = "") => {
  const normalized = String(src).toLowerCase();
  return normalized.includes("/phase1/") || AUDIO_EXT_RE.test(normalized);
};

const VideoPreviewModal = ({ open, src, title = "Pregled klipa", onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.scrollTo({ top: 0, behavior: "smooth" });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open || !src) return null;

  const audioOnly = isAudioSource(src);
  const modal = (
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

  return createPortal(modal, document.body);
};

export default VideoPreviewModal;
