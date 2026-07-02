"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type GhostMannequin360ViewerProps = {
  frameUrls: string[];
  fallbackImageUrl?: string;
  alt?: string;
  autoplay?: boolean;
  className?: string;
};

export default function GhostMannequin360Viewer({
  frameUrls,
  fallbackImageUrl,
  alt = "Ghost mannequin product view",
  autoplay = false,
  className = "",
}: GhostMannequin360ViewerProps) {
  const frames = useMemo(() => frameUrls.filter(Boolean), [frameUrls]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartFrame = useRef(0);
  const canSpin = frames.length >= 4;
  const imageUrl = canSpin ? frames[activeFrame] : fallbackImageUrl || frames[0] || "";

  useEffect(() => {
    if (!autoplay || !canSpin || isDragging) return;
    const timer = window.setInterval(() => {
      setActiveFrame((current) => (current + 1) % frames.length);
    }, 650);
    return () => window.clearInterval(timer);
  }, [autoplay, canSpin, frames.length, isDragging]);

  function updateFrame(clientX: number) {
    if (!canSpin) return;
    const delta = clientX - dragStartX.current;
    const frameDelta = Math.round(delta / 28);
    const nextFrame = (dragStartFrame.current - frameDelta) % frames.length;
    setActiveFrame(nextFrame < 0 ? nextFrame + frames.length : nextFrame);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canSpin) return;
    setIsDragging(true);
    dragStartX.current = event.clientX;
    dragStartFrame.current = activeFrame;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    updateFrame(event.clientX);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!imageUrl) {
    return (
      <div className={`flex aspect-square items-center justify-center bg-neutral-100 text-sm text-neutral-500 ${className}`}>
        Ghost mannequin image unavailable.
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 ${canSpin ? "cursor-grab touch-pan-y active:cursor-grabbing" : ""} ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role={canSpin ? "slider" : "img"}
      aria-label={canSpin ? "Drag to rotate ghost mannequin product view" : alt}
      aria-valuemin={canSpin ? 1 : undefined}
      aria-valuemax={canSpin ? frames.length : undefined}
      aria-valuenow={canSpin ? activeFrame + 1 : undefined}
      tabIndex={canSpin ? 0 : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} loading="lazy" className="h-full w-full select-none object-contain" draggable={false} />
      {canSpin ? (
        <div className="pointer-events-none absolute bottom-3 left-3 bg-[#4A0F14] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white">
          Drag to rotate
        </div>
      ) : null}
      <div className="sr-only">
        {canSpin ? `${frames.length} ghost mannequin frames loaded. Showing frame ${activeFrame + 1}.` : "Static ghost mannequin fallback image."}
      </div>
      <div className="hidden">
        {frames.map((frameUrl, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={frameUrl} src={frameUrl} alt="" loading={index < 2 ? "eager" : "lazy"} />
        ))}
      </div>
    </div>
  );
}
