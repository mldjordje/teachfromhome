"use client";

import { useEffect } from "react";

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

  return (
    <div className="tfh-video-modal" role="dialog" aria-modal="true" onClick={() => onClose?.()}>
      <div className="tfh-video-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="tfh-video-modal-head">
          <strong>{title}</strong>
          <button type="button" className="tfh-video-modal-close" onClick={() => onClose?.()}>
            Zatvori
          </button>
        </div>
        <video className="tfh-video-player" src={src} controls playsInline preload="metadata" />
      </div>
    </div>
  );
};

export default VideoPreviewModal;
