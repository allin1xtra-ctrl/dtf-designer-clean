"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { sendAddToCart } from "../../lib/addToCart";
import dynamic from "next/dynamic";
import React from "react";

const PrintAreaBox = dynamic(() => import("./PrintAreaBox"), { ssr: false });
const ArtworkCanvas = dynamic(() => import("./ArtworkCanvas"), { ssr: false });

const VIEWS = ["front", "back", "left_sleeve", "right_sleeve", "neck"];

// Example composited animation usage
// <div className="composited-anim" style={{ transform: isOpen ? 'translateY(0)' : 'translateY(-20px)', opacity: isOpen ? 1 : 0 }} />

// MultiViewEditor component (modular, for integration with CustomizerApp)
const MultiViewEditor = ({ views, activeView, onSwitchView, onAddView, onRemoveView }) => (
  <div className="customizer-multiview-editor">
    <div className="view-tabs">
      {views.map((view, idx) => (
        <button
          key={view.id || idx}
          className={activeView === view.id ? "active" : ""}
          onClick={() => onSwitchView(view.id)}
        >
          {view.label || `View ${idx + 1}`}
          {views.length > 1 && (
            <span
              className="remove-view"
              title="Remove view"
              onClick={e => { e.stopPropagation(); onRemoveView(view.id); }}
              style={{ marginLeft: 6, color: "#f00", cursor: "pointer" }}
            >
              ×
            </span>
          )}
        </button>
      ))}
      <button className="add-view" onClick={onAddView} title="Add new view">＋</button>
    </div>
  </div>
);

export default MultiViewEditor;