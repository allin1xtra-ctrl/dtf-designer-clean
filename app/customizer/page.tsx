"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Textbox } from "fabric";
import { getShopifyCartAddUrl, normalizeVariantId } from "../lib/shopify";

type ViewName = "front" | "back" | "leftSleeve" | "rightSleeve" | "neck";

const VIEW_LABELS: Record<ViewName, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "Left Sleeve",
  rightSleeve: "Right Sleeve",
  neck: "Neck Label",
};

export default function CustomizerPage() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<any>(null);

  const [currentView, setCurrentView] = useState<ViewName>("front");
  const [isReady, setIsReady] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState("");
  const [productHandle, setProductHandle] = useState("");
  const [previewImage, setPreviewImage] = useState("");

  const viewsRef = useRef<Record<ViewName, any>>({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neck: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const variant = params.get("variant");
    const product = params.get("product");

    setVariantId(normalizeVariantId(variant));
    setProductHandle(product || "");
  }, []);

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

  const getCanvas = (): any => fabricCanvasRef.current;

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
    }

    canvas.renderAll();
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

        img.scaleToWidth(220);

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
      fontSize: 32,
      width: 250,
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

  const rotateSelected = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.set("angle", (activeObject.angle || 0) + 15);
    activeObject.setCoords();
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

  const sendBackward = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.sendObjectBackwards(activeObject);
    canvas.renderAll();
  };

  const prepareShopifyCart = () => {
    const canvas = getCanvas();
    if (!canvas) return "";

    saveCurrentView();

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });

    setPreviewImage(dataURL);

    return dataURL;
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
    <div className="flex min-h-screen bg-[#0e0e0e] text-white">
      <aside className="w-[300px] shrink-0 border-r border-[#222] bg-[#111] p-5">
        <h1 className="text-xl font-bold">DTF Designer Pro</h1>

        <p className="mt-1 text-sm text-gray-400">
          Upload artwork, add text, design print areas, and send custom design
          details to Shopify checkout.
        </p>

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
            Upload Artwork
          </h2>

          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="block w-full cursor-pointer rounded bg-[#1f1f1f] p-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-[#333] file:px-3 file:py-2 file:text-white"
          />
        </div>

        <div className="mt-5 grid gap-2">
          <button
            onClick={addText}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Add Text
          </button>

          <button
            onClick={removeSelected}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Delete Selected
          </button>

          <button
            onClick={rotateSelected}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Rotate Selected
          </button>

          <button
            onClick={bringForward}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Bring Forward
          </button>

          <button
            onClick={sendBackward}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Send Backward
          </button>
        </div>

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">
            Print Areas
          </h2>

          <div className="grid gap-2">
            {(Object.keys(VIEW_LABELS) as ViewName[]).map((view) => (
              <button
                key={view}
                onClick={() => loadView(view)}
                className={`rounded px-4 py-3 text-left ${
                  currentView === view
                    ? "bg-white text-black"
                    : "bg-[#1f1f1f] hover:bg-[#333]"
                }`}
              >
                {VIEW_LABELS[view]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={downloadDesign}
            className="w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Download Print File
          </button>
        </div>

        <form
          method="POST"
          action={getShopifyCartAddUrl()}
          onSubmit={() => prepareShopifyCart()}
          className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4"
        >
          <h2 className="mb-2 text-lg font-semibold">Checkout</h2>

          <input type="hidden" name="id" value={variantId} />
          <input type="hidden" name="quantity" value={quantity} />

          <input
            type="hidden"
            name="properties[_product_handle]"
            value={productHandle}
          />

          <input
            type="hidden"
            name="properties[_preview_image]"
            value={previewImage}
          />

          <input
            type="hidden"
            name="properties[_customization_data]"
            value={JSON.stringify(viewsRef.current)}
          />

          <label className="mb-2 block text-sm text-gray-300">Quantity</label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white"
          />

          <button
            type="submit"
            disabled={!variantId}
            className="w-full rounded bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Custom Design to Cart
          </button>

          {!variantId && (
            <p className="mt-2 text-xs text-yellow-400">
              Missing Shopify variant ID. Open this page from a product
              Customize button.
            </p>
          )}
        </form>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex h-[60px] items-center border-b border-[#222] bg-[#111] px-5">
          <span className="text-sm text-gray-300">
            Current view:{" "}
            <strong className="text-white">{VIEW_LABELS[currentView]}</strong>
          </span>

          {!isReady && (
            <span className="ml-4 text-sm text-yellow-400">
              Loading canvas...
            </span>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center bg-[#181818] p-6">
          <div className="rounded border border-[#333] bg-white shadow-2xl">
            <canvas ref={canvasElRef} />
          </div>
        </div>
      </main>
    </div>
  );
}