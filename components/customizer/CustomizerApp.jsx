
"use client";
import React from "react";
import ProductSelector from './ProductSelector';
import CartIntegration from './CartIntegration';
import OwnerControls from './OwnerControls';

import Toolbar from './Toolbar';
import MultiViewEditor from './MultiViewEditor';
import PropertiesPanel from './PropertiesPanel';

export default function CustomizerApp() {
  const shopifyContext = null;
  const product = null;
  const loading = false;
  // Example state for integration
  const [selectedObject, setSelectedObject] = React.useState(null);
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [views, setViews] = React.useState([{ id: 'front', label: 'Front' }]);
  const [activeView, setActiveView] = React.useState('front');

  // Example handlers (replace with real logic)
  const handleAction = (action) => {
    // Implement undo/redo logic
  };
  const handleZoomIn = () => setZoomLevel(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(z => Math.max(z - 0.1, 0.5));
  const handleSwitchView = (id) => setActiveView(id);
  const handleAddView = () => {
    const newId = `view${views.length + 1}`;
    setViews([...views, { id: newId, label: `View ${views.length + 1}` }]);
    setActiveView(newId);
  };
  const handleRemoveView = (id) => {
    if (views.length <= 1) return;
    const filtered = views.filter(v => v.id !== id);
    setViews(filtered);
    setActiveView(filtered[0].id);
  };
  const handleObjectChange = (obj) => setSelectedObject(obj);
  const handleDelete = () => setSelectedObject(null);
  const handleDuplicate = () => {/* Implement duplication */};

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">DTF Pro Customizer</h1>
      <Toolbar
        onAction={handleAction}
        canUndo={canUndo}
        canRedo={canRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        zoomLevel={zoomLevel}
      />
      <ProductSelector onSelect={(id) => console.log(id)} />
      <MultiViewEditor
        views={views}
        activeView={activeView}
        onSwitchView={handleSwitchView}
        onAddView={handleAddView}
        onRemoveView={handleRemoveView}
      />
      <PropertiesPanel
        selectedObject={selectedObject}
        onChange={handleObjectChange}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
      <CartIntegration loading={loading} product={product} shopifyContext={shopifyContext} />
      <OwnerControls />
    </div>
  );
}
