"use client";

const Toolbar = ({ onAction, canUndo, canRedo, onZoomIn, onZoomOut, zoomLevel }) => (
  <div className="customizer-toolbar">
    <button onClick={() => onAction("undo")} disabled={!canUndo} title="Undo">
      ⎌ Undo
    </button>

    <button onClick={() => onAction("redo")} disabled={!canRedo} title="Redo">
      ↻ Redo
    </button>

    <button onClick={onZoomIn} title="Zoom In">
      ＋
    </button>

    <span className="zoom-level">
      {Math.round((zoomLevel || 1) * 100)}%
    </span>

    <button onClick={onZoomOut} title="Zoom Out">
      －
    </button>
  </div>
);

export default Toolbar;
