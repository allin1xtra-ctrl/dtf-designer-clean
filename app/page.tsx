"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Textbox } from "fabric";

type ViewName = "front" | "back" | "leftSleeve" | "rightSleeve";

export default function Page() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  const [currentView, setCurrentView] = useState<ViewName>("front");
  const [isReady, setIsReady] = useState(false);

  const viewsRef = useRef<Record<ViewName, any>>({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
  });

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: 500,
      height: 600,
      backgroundColor: "#ffffff",
    });

    fabricCanvasRef.current = canvas;
    setIsReady(true);

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  const getCanvas = () => fabricCanvasRef.current;

  const saveCurrentView = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    viewsRef.current[currentView] = canvas.toJSON();
  };

  const loadView = async (view: ViewName) => {
    const canvas = getCanvas();
    if (!canvas) return;

    saveCurrentView();
    canvas.clear();
    canvas.backgroundColor = "#ffffff";

    setCurrentView(view);

    const saved = viewsRef.current[view];

    if (saved?.objects?.length) {
      await canvas.loadFromJSON(saved);
      canvas.renderAll();
    } else {
      canvas.renderAll();
    }
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const canvas = getCanvas();

    if (!file || !canvas) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
      const result = e.target?.result;
      if (!result || typeof result !== "string") return;

      try {
        const img = await FabricImage.fromURL(result);
        img.set({
          left: 100,
          top: 100,
        });
        img.scaleToWidth(200);
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      } catch (error) {
        console.error("Image upload failed:", error);
      }
    };

    reader.readAsDataURL(file);

    event.target.value = "";
  };

  const addText = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const text = new Textbox("Your Design", {
      left: 100,
      top: 100,
      fill: "#000000",
      fontSize: 30,
      width: 220,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const removeSelected = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const bringForward = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.bringObjectForward(activeObject);
    canvas.renderAll();
  };

  const sendBack = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.sendObjectBackwards(activeObject);
    canvas.renderAll();
  };

  const rotate = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.set("angle", (activeObject.angle || 0) + 15);
    activeObject.setCoords();
    canvas.renderAll();
  };

  const flip = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.set("flipX", !activeObject.flipX);
    activeObject.setCoords();
    canvas.renderAll();
  };

  const zoomIn = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const nextZoom = Math.min(canvas.getZoom() + 0.1, 3);
    canvas.setZoom(nextZoom);
    canvas.renderAll();
  };

  const zoomOut = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const nextZoom = Math.max(canvas.getZoom() - 0.1, 0.5);
    canvas.setZoom(nextZoom);
    canvas.renderAll();
  };

  const downloadDesign = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `DTF-Print-${currentView}.png`;
    link.click();
  };

  return (
    <div className="flex h-screen bg-[#0e0e0e] text-white">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 border-r border-[#222] bg-[#111] p-5 overflow-y-auto">
        <h2 className="mb-2 text-lg font-semibold">Upload Design</h2>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="mb-4 block w-full cursor-pointer rounded bg-[#1f1f1f] p-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-[#333] file:px-3 file:py-2 file:text-white"
        />

        <h2 className="mb-2 text-lg font-semibold">Text</h2>
        <button
          onClick={addText}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Add Text
        </button>

        <h2 className="mb-2 mt-4 text-lg font-semibold">Tools</h2>
        <button
          onClick={removeSelected}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Delete
        </button>
        <button
          onClick={bringForward}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Bring Forward
        </button>
        <button
          onClick={sendBack}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Send Back
        </button>

        <h2 className="mb-2 mt-4 text-lg font-semibold">Print Areas</h2>
        <button
          onClick={() => loadView("front")}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Front
        </button>
        <button
          onClick={() => loadView("back")}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Back
        </button>
        <button
          onClick={() => loadView("leftSleeve")}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Left Sleeve
        </button>
        <button
          onClick={() => loadView("rightSleeve")}
          className="mb-2 w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Right Sleeve
        </button>

        <h2 className="mb-2 mt-4 text-lg font-semibold">Export</h2>
        <button
          onClick={downloadDesign}
          className="w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
        >
          Download Print File
        </button>
      </aside>

      {/* Main */}
      <main className="relative flex-1 bg-[#181818]">
        {/* Topbar */}
        <div className="absolute left-0 right-0 top-0 z-10 flex h-[60px] items-center gap-2 border-b border-[#222] bg-[#111] px-4">
          <button
            onClick={rotate}
            className="rounded bg-[#1f1f1f] px-4 py-2 hover:bg-[#333]"
          >
            Rotate
          </button>
          <button
            onClick={flip}
            className="rounded bg-[#1f1f1f] px-4 py-2 hover:bg-[#333]"
          >
            Flip
          </button>
          <button
            onClick={zoomIn}
            className="rounded bg-[#1f1f1f] px-4 py-2 hover:bg-[#333]"
          >
            Zoom +
          </button>
          <button
            onClick={zoomOut}
            className="rounded bg-[#1f1f1f] px-4 py-2 hover:bg-[#333]"
          >
            Zoom -
          </button>

          <div className="ml-auto text-sm text-gray-300">
            View: <span className="font-semibold capitalize">{currentView}</span>
            {!isReady && <span className="ml-3 text-yellow-400">Loading canvas...</span>}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex h-full items-center justify-center pt-[60px]">
          <div className="rounded border border-[#333] bg-white shadow-2xl">
            <canvas ref={canvasElRef} />
          </div>
        </div>
      </main>
    </div>
  );
}