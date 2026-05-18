return (
  <div className="h-[100dvh] overflow-hidden bg-black text-white">
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

      html,
      body {
        overflow-x: hidden;
      }
    `}</style>

    <div className="flex h-full min-w-[960px] flex-row overflow-hidden bg-black">
      <aside className="w-[360px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-[#222] bg-[#111]">
        <PrintLocationControls
          availableViews={availableViews}
          currentView={currentView}
          isReady={isReady}
          loadView={loadView}
          printLocationsError={printLocationsError}
        />

        {/* KEEP ALL YOUR EXISTING CONTROLS HERE */}
        {/* Everything currently inside <aside> stays here */}
        {/* Upload, AI tools, object tools, text tools, checkout, Add to Cart */}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          ref={previewPaneRef}
          className="flex h-full w-full items-center justify-center overflow-hidden bg-[#181818] px-2 py-2"
        >
          <div
            className={getPreviewStageClassName(currentView)}
            style={{
              width: `${CANVAS_DEFAULT_WIDTH}px`,
              height: `${CANVAS_DEFAULT_HEIGHT}px`,
              transform: `scale(${previewScale})`,
              transformOrigin: "center center",
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
    </div>
  </div>
);
