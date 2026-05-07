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
          <label htmlFor="prop-text">
            Text:
            <input
              id="prop-text"
              name="text"
              type="text"
              value={selectedObject.text || ""}
              onChange={e => handleChange("text", e.target.value)}
            />
          </label>
          <label htmlFor="prop-font-size">
            Font Size:
            <input
              id="prop-font-size"
              name="fontSize"
              type="number"
              value={selectedObject.fontSize || 24}
              min={8}
              max={200}
              onChange={e => handleChange("fontSize", parseInt(e.target.value, 10))}
            />
          </label>
          <label htmlFor="prop-font-family">
            Font Family:
            <input
              id="prop-font-family"
              name="fontFamily"
              type="text"
              value={selectedObject.fontFamily || "Arial"}
              onChange={e => handleChange("fontFamily", e.target.value)}
            />
          </label>
          <label htmlFor="prop-fill-color">
            Fill Color:
            <input
              id="prop-fill-color"
              name="fill"
              type="color"
              value={selectedObject.fill || "#000000"}
              onChange={e => handleChange("fill", e.target.value)}
            />
          </label>
        </>
      )}
      {selectedObject.type === "image" && (
        <>
          <label htmlFor="prop-opacity">
            Opacity:
            <input
              id="prop-opacity"
              name="opacity"
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
