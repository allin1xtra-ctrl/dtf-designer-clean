return (
  <div className="h-[100dvh] overflow-hidden bg-[#0e0e0e] text-white">
    <style jsx global>{`
      html,
      body {
        overflow-x: hidden;
      }

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
    `}</style>

    {/* 
      MOBILE: flex-col — canvas on top, controls scroll below
      DESKTOP (md+): flex-row — sidebar left, canvas right
    */}
    <div className="flex h-full flex-col overflow-hidden bg-black md:flex-row">

      {/* ── CANVAS (top on mobile, right on desktop) ── */}
      {/* On mobile: renders first in DOM but we use order-first */}
      <main className="order-first flex min-h-0 flex-1 overflow-hidden md:order-last">
        <div
          ref={previewPaneRef}
          className="flex h-full w-full items-center justify-center overflow-hidden bg-[#181818] p-2"
        >
          <div
            className={getPreviewStageClassName(currentView)}
            style={{
              width: `${CANVAS_DEFAULT_WIDTH}px`,
              height: `${CANVAS_DEFAULT_HEIGHT}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolvedMockupUrl}
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

      {/* ── SIDEBAR / CONTROLS (bottom on mobile, left on desktop) ── */}
      {/* 
        Mobile: fixed height ~45vh so canvas gets the rest, scrolls internally
        Desktop: full height, fixed 360px wide, scrolls internally
      */}
      <aside className="order-last flex h-[45vh] w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-t border-[#222] bg-[#111] p-4 md:order-first md:h-full md:w-[360px] md:border-r md:border-t-0 md:p-5">
        <div>
          <h1 className="text-xl font-bold">DTF Designer Pro</h1>
          <p className="mt-1 text-sm text-gray-400">
            Upload artwork, customize DTF transfers and gang sheets, place designs on custom
            t-shirts and hoodies, then send your order details to Shopify checkout.
          </p>
        </div>

        <div className="mt-5">
          <PrintLocationControls
            availableViews={availableViews}
            currentView={currentView}
            isReady={isReady}
            loadView={loadView}
            printLocationsError={printLocationsError}
          />
        </div>

        {draftStatus ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 rounded border border-[#2b2b2b] bg-[#1a1a1a] px-3 py-2 text-xs text-gray-300"
          >
            {draftStatus}
          </div>
        ) : null}

        {/* PASTE ALL EXISTING CONTROL BLOCKS HERE */}
        {/* Everything from Upload Artwork through Checkout/Add to Cart stays here. */}
      </aside>

    </div>
  </div>
);
