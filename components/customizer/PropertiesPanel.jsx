import React from "react";

const PropertiesPanel = ({ selectedObject, onChange, onDelete, onDuplicate }) => {
  if (!selectedObject) {
    return <div className="customizer-properties-panel">Select an object to edit its properties.</div>;
  }

  const handleChange = (prop, value) => {
    onChange({ ...selectedObject, [prop]: value });
  };

  return (
    <div className="customizer-properties-panel">
      <h4>Properties</h4>
      {selectedObject.type === "text" && (
        <>
          <label>
            Text:
            <input
              type="text"
              value={selectedObject.text || ""}
              onChange={e => handleChange("text", e.target.value)}
            />
          </label>
          <label>
            Font Size:
            <input
              type="number"
              value={selectedObject.fontSize || 24}
              min={8}
              max={200}
              onChange={e => handleChange("fontSize", parseInt(e.target.value, 10))}
            />
          </label>
          <label>
            Font Family:
            <input
              type="text"
              value={selectedObject.fontFamily || "Arial"}
              onChange={e => handleChange("fontFamily", e.target.value)}
            />
          </label>
          <label>
            Fill Color:
            <input
              type="color"
              value={selectedObject.fill || "#000000"}
              onChange={e => handleChange("fill", e.target.value)}
            />
          </label>
        </>
      )}
      {selectedObject.type === "image" && (
        <>
          <label>
            Opacity:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={selectedObject.opacity || 1}
              onChange={e => handleChange("opacity", parseFloat(e.target.value))}
            />
          </label>
        </>
      )}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={onDelete} style={{ marginRight: 8 }}>Delete</button>
        <button onClick={onDuplicate}>Duplicate</button>
      </div>
    </div>
  );
};

export default PropertiesPanel;
