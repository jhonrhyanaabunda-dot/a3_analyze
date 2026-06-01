"use client";

import { forwardRef } from "react";

/** Transparent Saggy video with cross-browser sources (webm alpha / Safari hevc / mp4). */
const Mascot = forwardRef<HTMLVideoElement, { className?: string; muted?: boolean }>(
  function Mascot({ className, muted = true }, ref) {
    return (
      <video
        ref={ref}
        className={className}
        autoPlay
        muted={muted}
        loop
        playsInline
        preload="auto"
      >
        <source src="/saggy_mascot.webm" type="video/webm" />
        <source src="/saggy_alpha.mov" type="video/quicktime" />
        <source src="/saggy_mascot.mp4" type="video/mp4" />
      </video>
    );
  }
);

export default Mascot;
