"use client";

import { MouseEvent, PointerEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";

export type CustomGhost360EffectStyle = "studio" | "ghost-fade" | "floor-shadow" | "reflection";

type CustomGhost360ViewerProps = {
  frameUrls: string[];
  fallbackImageUrl?: string;
  alt?: string;
  effectStyle?: CustomGhost360EffectStyle;
  autoplay?: boolean;
  showControls?: boolean;
  className?: string;
};

export default function CustomGhost360Viewer({
  frameUrls,
  fallbackImageUrl,
  alt = "Custom Ghost 360 product view",
  effectStyle = "studio",
  autoplay = false,
  showControls = true,
  className = "",
}: CustomGhost360ViewerProps) {
  const frames = useMemo(() => frameUrls.filter(Boolean), [frameUrls]);
  const [activeFrame, setActiveFrame] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [autoplayOn, setAutoplayOn] = useState(autoplay);
  const dragStartX = useRef(0);
  const dragStartFrame = useRef(0);
  const canRotate = frames.length >= 2;
  const imageUrl = frames[activeFrame] || fallbackImageUrl || frames[0] || "";

  useEffect(() => {
    setAutoplayOn(autoplay);
  }, [autoplay]);

  useEffect(() => {
    if (!autoplayOn || !canRotate || isDragging) return;
    const timer = window.setInterval(() => {
      setActiveFrame((current) => (current + 1) % frames.length);
    }, 850);
    return () => window.clearInterval(timer);
  }, [autoplayOn, canRotate, frames.length, isDragging]);

  function setFrameFromDelta(clientX: number) {
    if (!canRotate) return;
    const delta = clientX - dragStartX.current;
    const frameDelta = Math.round(delta / 32);
    const nextFrame = (dragStartFrame.current - frameDelta) % frames.length;
    setActiveFrame(nextFrame < 0 ? nextFrame + frames.length : nextFrame);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canRotate) return;
    setAutoplayOn(false);
    setIsDragging(true);
    dragStartX.current = event.clientX;
    dragStartFrame.current = activeFrame;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (isDragging) {
      setFrameFromDelta(event.clientX);
      return;
    }
    if (event.pointerType !== "mouse" || !canRotate) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setActiveFrame(Math.min(frames.length - 1, Math.floor(position * frames.length)));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!canRotate) return;
    setAutoplayOn(false);
    setIsDragging(true);
    dragStartX.current = event.clientX;
    dragStartFrame.current = activeFrame;
  }

  function onMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (isDragging) {
      setFrameFromDelta(event.clientX);
      return;
    }
    if (!canRotate) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setActiveFrame(Math.min(frames.length - 1, Math.floor(position * frames.length)));
  }

  function onMouseUp() {
    if (isDragging) setIsDragging(false);
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!canRotate) return;
    setAutoplayOn(false);
    setIsDragging(true);
    dragStartX.current = event.touches[0]?.clientX || 0;
    dragStartFrame.current = activeFrame;
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setFrameFromDelta(event.touches[0]?.clientX || dragStartX.current);
  }

  const styleClass = {
    studio: "bg-white",
    "ghost-fade": "bg-white",
    "floor-shadow": "bg-white",
    reflection: "bg-white",
  }[effectStyle];

  if (!imageUrl) {
    return (
      <div className={`flex aspect-square items-center justify-center bg-white text-sm text-neutral-500 ${className}`}>
        Product image unavailable.
      </div>
    );
  }

  return (
    <div className={`relative aspect-square w-full overflow-hidden ${styleClass} ${className}`}>
      <div
        className={`relative h-full w-full touch-pan-y ${canRotate ? "cursor-ew-resize" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
        onTouchCancel={onMouseUp}
        role={canRotate ? "slider" : "img"}
        aria-label={canRotate ? "Drag or swipe to rotate custom ghost 360 product view" : alt}
        aria-valuemin={canRotate ? 1 : undefined}
        aria-valuemax={canRotate ? frames.length : undefined}
        aria-valuenow={canRotate ? activeFrame + 1 : undefined}
        tabIndex={canRotate ? 0 : undefined}
      >
        <div className="pointer-events-none absolute inset-x-[16%] bottom-[11%] h-[8%] rounded-full bg-black/15 blur-xl" />
        {effectStyle === "ghost-fade" ? <div className="pointer-events-none absolute inset-[8%] rounded-full bg-cyan-100/30 blur-3xl" /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          draggable={false}
          className={`relative z-10 h-full w-full select-none object-contain p-[7%] transition-opacity duration-200 ${effectStyle === "ghost-fade" ? "opacity-95 mix-blend-multiply" : ""}`}
        />
        {effectStyle === "reflection" ? (
          <div className="pointer-events-none absolute inset-x-[18%] bottom-[2%] h-[20%] overflow-hidden opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" loading="lazy" draggable={false} className="h-full w-full scale-y-[-1] object-contain object-top blur-[1px]" />
          </div>
        ) : null}
        {canRotate ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 bg-[#4A0F14] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white">
            Drag / swipe
          </div>
        ) : (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 bg-neutral-950/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white">
            Static
          </div>
        )}
      </div>

      {showControls && canRotate ? (
        <button
          type="button"
          onClick={() => setAutoplayOn((current) => !current)}
          className="absolute bottom-3 right-3 z-30 bg-[#4A0F14] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#64151c] focus:outline-none focus:ring-2 focus:ring-cyan-300"
        >
          {autoplayOn ? "Pause" : "Autoplay"}
        </button>
      ) : null}

      <div className="sr-only">
        {canRotate ? `${frames.length} custom ghost 360 frames loaded. Showing frame ${activeFrame + 1}.` : "Static custom ghost product image."}
      </div>
      <div className="hidden">
        {frames.map((frameUrl, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${frameUrl}-${index}`} src={frameUrl} alt="" loading={index < 2 ? "eager" : "lazy"} />
        ))}
      </div>
    </div>
  );
}
