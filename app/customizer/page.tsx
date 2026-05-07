"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Textbox } from "fabric";
import { normalizeVariantId } from "../lib/shopify";

const FALLBACK_VARIANT_ID = "47766570074286";

type ViewName = "front" | "back" | "leftSleeve" | "rightSleeve" | "neck";

const VIEW_LABELS: Record<ViewName, string> = {
  front: "Front",
  back: "Back",
  leftSleeve: "Left Sleeve",
  rightSleeve: "Right Sleeve",
  neck: "Neck Label",
};

type CanvasSnapshot = ReturnType<Canvas["toJSON"]>;
type UploadResponse = {
  error?: string;
  url?: string;
};

const SHOPIFY_PARENT_ORIGIN = "https://yourdtfplug.com";

function createDesignId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `DTF-${globalThis.crypto.randomUUID()}`;
  }

  const values = new Uint32Array(2);
  globalThis.crypto?.getRandomValues(values);

  return `DTF-${values[0].toString(36)}${values[1].toString(36)}`;
}

function isBase64DataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

export default function CustomizerPage() {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentView, setCurrentView] = useState<ViewName>("front");
  const [isReady, setIsReady] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [variantId, setVariantId] = useState(FALLBACK_VARIANT_ID);
  const [selectedSize, setSelectedSize] = useState("Custom");
  const [cartStatus, setCartStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const viewsRef = useRef<Record<ViewName, CanvasSnapshot | null>>({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neck: null,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Support variant, variantId, or variant_id; ignore v (cache-buster)
    const rawVariant =
      params.get("variant") ||
      params.get("variantId") ||
      params.get("variant_id");
    const normalized = normalizeVariantId(rawVariant);
    setVariantId(normalized || FALLBACK_VARIANT_ID);
    setSelectedSize(params.get("size") || "Custom");
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

  const exportCurrentViewBlob = async () => {
    const canvas = getCanvas();
    if (!canvas) return null;

    saveCurrentView();

    const renderedCanvas = canvas.lowerCanvasEl;

    if (!renderedCanvas) {
      return null;
    }

    return new Promise<Blob | null>((resolve) => {
      renderedCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const uploadPreviewImage = async () => {
    const blob = await exportCurrentViewBlob();

    if (!blob) {
      throw new Error("Preview image could not be generated.");
    }

    const formData = new FormData();
    formData.append("file", blob, `dtf-${currentView}.png`);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as UploadResponse;

    if (!response.ok || !result.url) {
      throw new Error(result.error || "Artwork upload failed.");
    }

    return result.url;
  };

  const handleAddToCart = async () => {
    const numericId = parseInt(variantId, 10);
    if (isNaN(numericId)) {
      console.error("Invalid variant ID:", variantId);
      return;
    }

    try {
      setIsSubmitting(true);
      setCartStatus("Uploading artwork...");

      const uploadedArtworkUrl = await uploadPreviewImage();
      const previewImageUrl = uploadedArtworkUrl;

      if (
        isBase64DataUrl(uploadedArtworkUrl) ||
        isBase64DataUrl(previewImageUrl)
      ) {
        alert(
          "Artwork is still processing. Please wait for the upload to finish before adding to cart."
        );
        setCartStatus("");
        return;
      }

      const payload = {
        id: numericId,
        quantity: Number(quantity || 1),
        properties: {
          "Design ID": createDesignId(),
          Size: selectedSize || "Custom",
          Placement: VIEW_LABELS[currentView],
          "Artwork URL": uploadedArtworkUrl,
          "Preview URL": previewImageUrl,
        },
      };

      window.parent.postMessage(
        { type: "DTF_ADD_TO_CART", data: payload },
        SHOPIFY_PARENT_ORIGIN
      );
      setCartStatus("Custom design sent to cart. Redirecting...");
    } catch (error) {
      console.error("Add to cart failed:", error);
      setCartStatus("Artwork upload failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="block w-full cursor-pointer rounded bg-[#1f1f1f] p-2 text-sm text-white hover:bg-[#333]"
          >
            Upload Artwork
          </button>
        </div>

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={addText}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Add Text
          </button>

          <button
            type="button"
            onClick={removeSelected}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Delete Selected
          </button>

          <button
            type="button"
            onClick={rotateSelected}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Rotate Selected
          </button>

          <button
            type="button"
            onClick={bringForward}
            className="rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Bring Forward
          </button>

          <button
            type="button"
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
                type="button"
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
            type="button"
            onClick={downloadDesign}
            className="w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]"
          >
            Download Print File
          </button>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-lg font-semibold">Checkout</h2>

          <label className="mb-2 block text-sm text-gray-300">Size</label>
          <input
            type="text"
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white"
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
            type="button"
            onClick={handleAddToCart}
            disabled={isSubmitting}
            className="w-full rounded bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200"
          >
            {isSubmitting ? "Uploading..." : "Add Custom Design to Cart"}
          </button>

          {cartStatus ? (
            <p className="mt-3 text-sm text-gray-300">{cartStatus}</p>
          ) : null}
        </div>
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
