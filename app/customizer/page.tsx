"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, FabricImage, Path, Shadow, Textbox } from "fabric";
import { normalizeVariantId } from "../lib/shopify";

// ...existing constants, types, and utility functions (unchanged)...
// (Keep all your constants, types, and utility functions as in your current file.)
// For brevity, only the layout and style section is shown below. If you need the full file with all logic, let me know.

export default function CustomizerPage() {
  // ...all your React state, refs, hooks, and logic (unchanged)...
  // (Keep all your state, hooks, and logic as in your current file.)

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0e0e0e] text-white">
      <style jsx global>{`
        .canvas-container,
        .upper-canvas,
        .lower-canvas {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          max-width: 100% !important;
          max-height: 100% !important;
        }

        .canvas-container {
          z-index: 10 !important;
        }

        .customizer-mobile-shell-wrap {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .customizer-mobile-shell {
          display: grid;
          grid-template-columns: minmax(170px, 40vw) minmax(170px, 1fr);
          width: 100%;
          min-width: 0;
          height: 100dvh;
          max-height: 100dvh;
          overflow: hidden;
        }

        @media (min-width: 769px) {
          .customizer-mobile-shell {
            grid-template-columns: 360px minmax(0, 1fr);
            height: 100%;
            max-height: 100%;
          }
        }

        @media (max-width: 768px) {
          html,
          body {
            overflow-x: hidden;
          }

          .customizer-mobile-shell-wrap {
            display: flex;
            height: 100%;
            width: 100%;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .canvas-container,
          .upper-canvas,
          .lower-canvas {
            transform-origin: top left !important;
          }
        }
      `}</style>
      <div className="customizer-mobile-shell-wrap">
        <div className="customizer-mobile-shell flex h-full min-w-0 overflow-hidden md:grid md:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="order-1 h-full min-w-0 overflow-y-auto border-r border-[#222] bg-[#111] p-3 pb-12 md:p-5">
            {/* ...sidebar content (unchanged, keep all your controls and panels here)... */}
          </aside>
          <main className="order-2 flex h-full min-h-0 min-w-0 overflow-hidden bg-[#181818]">
            <div
              ref={previewPaneRef}
              className="relative flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden px-1 py-1 md:px-4 md:py-4"
            >
              <div
                className={`${getPreviewStageClassName(currentView)} relative shrink-0`}
                style={{
                  width: `${CANVAS_DEFAULT_WIDTH}px`,
                  height: `${CANVAS_DEFAULT_HEIGHT}px`,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "center center",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mockupLoadFailed ? GENERIC_BLANK_MOCKUPS[currentView] : resolvedMockupUrl}
                  alt={`${VIEW_LABELS[currentView]} mockup`}
                  className={getMockupImageClassName()}
                  style={{
                    width: `${mockupRender.renderedWidth}px`,
                    height: `${mockupRender.renderedHeight}px`,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    const naturalWidth = image.naturalWidth || 0;
                    const naturalHeight = image.naturalHeight || 0;
                    setMockupNaturalSize((prev) =>
                      prev.width === naturalWidth && prev.height === naturalHeight
                        ? prev
                        : { width: naturalWidth, height: naturalHeight }
                    );
                  }}
                  onError={() => {
                    if (mockupLoadFailed) return;
                    setMockupLoadFailed(true);
                  }}
                />
                <div
                  className="pointer-events-none absolute z-20 border border-dashed border-cyan-400"
                  style={{
                    left: `${resolvedPrintAreaBounds.left}px`,
                    top: `${resolvedPrintAreaBounds.top}px`,
                    width: `${resolvedPrintAreaBounds.width}px`,
                    height: `${resolvedPrintAreaBounds.height}px`,
                  }}
                />
                <canvas ref={canvasElRef} className="relative z-10" />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
