"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Textbox } from "fabric";
import { normalizeVariantId } from "../lib/shopify";

const FALLBACK_VARIANT_ID = "47766570074286";
const CANVAS_DEFAULT_WIDTH = 500;
const CANVAS_DEFAULT_HEIGHT = 600;

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

type PrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PrintLocationData = {
  mockupUrl?: string;
  designArea?: Partial<PrintArea>;
};

type PrintLocationsMap = Record<string, PrintLocationData>;

type ProductByHandleResponse = {
  title?: string;
  handle?: string;
  metafield?: {
    value?: string;
  };
  variants?: Array<{
    id?: string;
  }>;
};
type ProductByHandleApiResponse = ProductByHandleResponse & {
  error?: string;
};

const SHOPIFY_PARENT_ORIGIN = "https://yourdtfplug.com";
const DEFAULT_DESIGN_AREA: PrintArea = { x: 10, y: 10, width: 80, height: 80 };
const VIEW_LOCATION_KEYS: Record<ViewName, string[]> = {
  front: ["front"],
  back: ["back"],
  leftSleeve: ["leftSleeve", "left_sleeve"],
  rightSleeve: ["rightSleeve", "right_sleeve"],
  neck: ["neck", "neckLabel", "neck_label", "neck_tag"],
};

function clampPercentage(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, parsed));
}

function normalizeDesignArea(value?: Partial<PrintArea>): PrintArea {
  return {
    x: clampPercentage(value?.x, DEFAULT_DESIGN_AREA.x),
    y: clampPercentage(value?.y, DEFAULT_DESIGN_AREA.y),
    width: clampPercentage(value?.width, DEFAULT_DESIGN_AREA.width),
    height: clampPercentage(value?.height, DEFAULT_DESIGN_AREA.height),
  };
}

function parsePrintLocations(value?: string): PrintLocationsMap {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse dtf.print_locations metafield:", error);
    return {};
  }
}

function getPrintLocationDataForView(
  printLocations: PrintLocationsMap,
  view: ViewName
): { activeLocation: string; activeLocationData: PrintLocationData } {
  const keys = VIEW_LOCATION_KEYS[view];

  for (const key of keys) {
    const location = printLocations[key];
    if (location && typeof location === "object") {
      return {
        activeLocation: key,
        activeLocationData: location,
      };
    }
  }

  return {
    activeLocation: keys[0] || view,
    activeLocationData: {},
  };
}

function createDesignId() {
  const timestamp = Date.now();
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return `DTF-${timestamp}-${cryptoApi.randomUUID()}`;
  }

  if (!cryptoApi?.getRandomValues) {
    return `DTF-${timestamp}-${Math.random().toString(36).slice(2, 14)}`;
  }

  const values = new Uint32Array(4);
  cryptoApi.getRandomValues(values);

  return `DTF-${timestamp}-${Array.from(values, (value) => value.toString(36)).join("")}`;
}

function isCloudinaryUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("https://res.cloudinary.com/")
  );
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
  const [productHandle, setProductHandle] = useState("");
  const [hasVariantInQuery, setHasVariantInQuery] = useState(false);
  const [printLocations, setPrintLocations] = useState<PrintLocationsMap>({});
  const [shouldDebugLog, setShouldDebugLog] = useState(false);

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
    const handleFromUrl = params.get("product") || params.get("handle") || "";
    const debugFlag = params.get("debugMockup") || params.get("debug");
    const debugEnabled = debugFlag === "1" || debugFlag === "true";
    setHasVariantInQuery(Boolean(normalized));
    setVariantId(normalized || FALLBACK_VARIANT_ID);
    setSelectedSize(params.get("size") || "Custom");
    setProductHandle(handleFromUrl);
    setShouldDebugLog(debugEnabled);
    if (debugEnabled) {
      console.log("productHandle", handleFromUrl);
    }
  }, []);

  useEffect(() => {
    if (!productHandle) return;

    let isMounted = true;
    const controller = new AbortController();

    const fetchProductByHandle = async () => {
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(productHandle)}`,
          { signal: controller.signal }
        );
        const raw = await response.text();
        const result = raw
          ? (JSON.parse(raw) as ProductByHandleApiResponse)
          : ({} as ProductByHandleApiResponse);

        if (!response.ok) {
          throw new Error(
            result.error || `Failed to load product (${response.status}).`
          );
        }

        if (!isMounted) return;

        const parsedLocations = parsePrintLocations(result.metafield?.value);
        setPrintLocations(parsedLocations);

        if (!hasVariantInQuery && result.variants?.[0]?.id) {
          const fallbackVariant = normalizeVariantId(result.variants[0].id);
          if (fallbackVariant) {
            setVariantId(fallbackVariant);
          }
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch product by handle:", error);
      }
    };

    fetchProductByHandle();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [hasVariantInQuery, productHandle]);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_DEFAULT_WIDTH,
      height: CANVAS_DEFAULT_HEIGHT,
      backgroundColor: "transparent",
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
    canvas.backgroundColor = "transparent";

    setCurrentView(view);

    const saved = viewsRef.current[view];

    if (saved?.objects?.length) {
      await canvas.loadFromJSON(saved);
    }

    canvas.renderAll();
  };

  const locationInfo = getPrintLocationDataForView(
    printLocations,
    currentView
  );
  const { activeLocation, activeLocationData } = locationInfo;
  const mockupUrl = activeLocationData?.mockupUrl;
  const designArea = normalizeDesignArea(activeLocationData?.designArea);

  useEffect(() => {
    if (!shouldDebugLog) return;
    console.log("printLocations", printLocations);
    console.log("activeLocation", activeLocation);
    console.log("activeLocationData", printLocations?.[activeLocation]);
    console.log("mockupUrl", printLocations?.[activeLocation]?.mockupUrl);
  }, [activeLocation, printLocations, shouldDebugLog]);

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
        const canvasWidth = canvas.getWidth() || CANVAS_DEFAULT_WIDTH;
        const canvasHeight = canvas.getHeight() || CANVAS_DEFAULT_HEIGHT;
        const areaLeft = (canvasWidth * designArea.x) / 100;
        const areaTop = (canvasHeight * designArea.y) / 100;
        const areaWidth = (canvasWidth * designArea.width) / 100;
        const areaHeight = (canvasHeight * designArea.height) / 100;

        img.scaleToWidth(areaWidth);
        if (img.getScaledHeight() > areaHeight) {
          img.scaleToHeight(areaHeight);
        }

        img.set({
          left: areaLeft + (areaWidth - img.getScaledWidth()) / 2,
          top: areaTop + (areaHeight - img.getScaledHeight()) / 2,
        });

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

      if (!isCloudinaryUrl(uploadedArtworkUrl)) {
        alert(
          "Artwork upload is not complete. Please wait and try again."
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
          "Preview URL": uploadedArtworkUrl,
        },
      };

      window.parent.postMessage(
        { type: "DTF_ADD_TO_CART", data: payload },
        SHOPIFY_PARENT_ORIGIN
      );
      setCartStatus("Custom design sent to Shopify cart.");
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
          <div
            className="relative overflow-hidden rounded border border-[#333] bg-white shadow-2xl"
            style={{
              width: `${CANVAS_DEFAULT_WIDTH}px`,
              height: `${CANVAS_DEFAULT_HEIGHT}px`,
            }}
          >
            {mockupUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mockupUrl}
                alt={`${VIEW_LABELS[currentView]} mockup`}
                className="absolute inset-0 z-0 h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#f3f3f3] text-sm font-medium text-gray-500">
                Mockup not configured
              </div>
            )}
            <canvas ref={canvasElRef} className="relative z-10" />
          </div>
        </div>
      </main>
    </div>
  );
}
