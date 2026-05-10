"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Path, Shadow, Textbox } from "fabric";
import { normalizeVariantId } from "../lib/shopify";

const FALLBACK_VARIANT_ID = "47766570074286";
const CANVAS_DEFAULT_WIDTH = 500;
const CANVAS_DEFAULT_HEIGHT = 600;

type ViewName = "front" | "back" | "leftSleeve" | "rightSleeve" | "neck";
type CurveMode = "none" | "arcUp" | "arcDown" | "wave";

type TextControlsState = {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  outlineColor: string;
  outlineWidth: number;
  shadow: boolean;
  glow: boolean;
  letterSpacing: number;
  bold: boolean;
  italic: boolean;
  uppercase: boolean;
  curveMode: CurveMode;
  bendCurve: number;
};

const DEFAULT_TEXT_CONTROLS: TextControlsState = {
  fontFamily: "Arial",
  fontSize: 32,
  textColor: "#000000",
  outlineColor: "#000000",
  outlineWidth: 0,
  shadow: false,
  glow: false,
  letterSpacing: 0,
  bold: false,
  italic: false,
  uppercase: false,
  curveMode: "none",
  bendCurve: 25,
};

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
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maxPrintWidth?: number;
  maxPrintHeight?: number;
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

type AiActionResponse = {
  ok?: boolean;
  error?: string;
  note?: string;
  imageDataUrl?: string;
  dataUrl?: string;
  suggestions?: string[];
};

const SHOPIFY_PARENT_ORIGIN = "https://yourdtfplug.com";
const DEFAULT_DESIGN_AREA: PrintArea = { x: 10, y: 10, width: 80, height: 80 };
const MIN_CURVE_AMPLITUDE = 8;
const MAX_CURVE_AMPLITUDE = 220;
const NEAR_WHITE_THRESHOLD = 245;
const SOFT_WHITE_THRESHOLD = 225;
const TRANSFER_SIZE_PRESETS = ["8x8", "10x10", "12x12", "12x16", "14x16", "16x20"];
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

function normalizeBoundPercent(value: unknown, fallback: number) {
  // Accept both normalized decimals (0-1) and percentages (0-100) from metafield payloads.
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed >= 0 && parsed <= 1) return clampPercentage(parsed * 100, fallback);
  return clampPercentage(parsed, fallback);
}

function normalizeDesignArea(value?: Partial<PrintLocationData>): PrintArea {
  const nestedArea = value?.designArea;
  return {
    x: normalizeBoundPercent(value?.x ?? nestedArea?.x, DEFAULT_DESIGN_AREA.x),
    y: normalizeBoundPercent(value?.y ?? nestedArea?.y, DEFAULT_DESIGN_AREA.y),
    width: normalizeBoundPercent(value?.width ?? nestedArea?.width, DEFAULT_DESIGN_AREA.width),
    height: normalizeBoundPercent(value?.height ?? nestedArea?.height, DEFAULT_DESIGN_AREA.height),
  };
}

function parsePrintLocations(value?: string): PrintLocationsMap {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to parse dtf.print_locations metafield:", {
      error,
      valuePreview: String(value).slice(0, 500),
    });
    return {};
  }
}

function normalizePrintLimit(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function hasConfiguredMockup(location?: PrintLocationData) {
  return Boolean(location?.mockupUrl && String(location.mockupUrl).trim());
}

function hasMetafieldLocationData(printLocations: PrintLocationsMap) {
  return Object.values(printLocations).some((location) => hasConfiguredMockup(location));
}

function getAvailableViews(printLocations: PrintLocationsMap) {
  return (Object.keys(VIEW_LABELS) as ViewName[]).filter((view) =>
    VIEW_LOCATION_KEYS[view].some((key) => hasConfiguredMockup(printLocations[key]))
  );
}

function parseTransferSize(value: string) {
  const match = String(value || "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
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
  return typeof value === "string" && value.startsWith("https://res.cloudinary.com/");
}

function getObjectType(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const candidate = value as { type?: unknown };
  return typeof candidate.type === "string" ? candidate.type : "";
}

function isTextObject(value: unknown): value is Textbox {
  const type = getObjectType(value);
  return type === "textbox" || type === "text" || type === "i-text";
}

function isImageObject(value: unknown): value is FabricImage {
  return getObjectType(value) === "image";
}

function isLockedObject(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { lockMovementX?: unknown; lockMovementY?: unknown };
  return Boolean(candidate.lockMovementX) && Boolean(candidate.lockMovementY);
}

function pxFromPercentage(total: number, percent: number) {
  return (total * percent) / 100;
}

function distanceFromPrintableArea(bounds: { left: number; top: number; width: number; height: number }, area: { left: number; top: number; width: number; height: number }) {
  const boundsRight = bounds.left + bounds.width;
  const boundsBottom = bounds.top + bounds.height;
  const areaRight = area.left + area.width;
  const areaBottom = area.top + area.height;

  const overflowLeft = Math.max(0, area.left - bounds.left);
  const overflowTop = Math.max(0, area.top - bounds.top);
  const overflowRight = Math.max(0, boundsRight - areaRight);
  const overflowBottom = Math.max(0, boundsBottom - areaBottom);
  return Math.max(overflowLeft, overflowTop, overflowRight, overflowBottom);
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
  const [transferSize, setTransferSize] = useState("12x12");
  const [cartStatus, setCartStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productHandle, setProductHandle] = useState("");
  const [hasVariantInQuery, setHasVariantInQuery] = useState(false);
  const [printLocations, setPrintLocations] = useState<PrintLocationsMap>({});
  const [printLocationsError, setPrintLocationsError] = useState("");
  const [shouldDebugLog, setShouldDebugLog] = useState(false);
  const [shouldDebugAiLog, setShouldDebugAiLog] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState("none");
  const [selectedLocked, setSelectedLocked] = useState(false);
  const [boundaryWarning, setBoundaryWarning] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [designIdeaPrompt, setDesignIdeaPrompt] = useState("");
  const [textControls, setTextControls] = useState<TextControlsState>(DEFAULT_TEXT_CONTROLS);
  const designAreaRef = useRef<PrintArea>(DEFAULT_DESIGN_AREA);
  const shouldDebugAiLogRef = useRef(false);

  const viewsRef = useRef<Record<ViewName, CanvasSnapshot | null>>({
    front: null,
    back: null,
    leftSleeve: null,
    rightSleeve: null,
    neck: null,
  });

  const getCanvas = () => fabricCanvasRef.current;

  const logAiDebug = (action: string, details: Record<string, unknown>) => {
    if (!shouldDebugAiLogRef.current) return;
    const activeObject = getCanvas()?.getActiveObject();
    console.log("[AI DEBUG]", {
      selectedObject: activeObject,
      selectedObjectType: getObjectType(activeObject) || "none",
      aiActionRequested: action,
      ...details,
    });
  };

  const syncTextControlsFromObject = (textObject: Textbox) => {
    const shadowValue = textObject.shadow;
    const hasGlow = shadowValue instanceof Shadow && shadowValue.blur >= 12 && shadowValue.offsetX === 0 && shadowValue.offsetY === 0;
    const hasShadow = shadowValue instanceof Shadow && !hasGlow && shadowValue.blur > 0;
    const curveModeCandidate = (textObject as unknown as { __curveMode?: CurveMode }).__curveMode;

    setTextControls((prev) => ({
      ...prev,
      fontFamily: textObject.fontFamily || "Arial",
      fontSize: Math.round(Number(textObject.fontSize) || 32),
      textColor: (textObject.fill as string) || "#000000",
      outlineColor: (textObject.stroke as string) || "#000000",
      outlineWidth: Number(textObject.strokeWidth) || 0,
      letterSpacing: Number(textObject.charSpacing) || 0,
      bold: textObject.fontWeight === "bold" || Number(textObject.fontWeight) >= 700,
      italic: textObject.fontStyle === "italic",
      uppercase:
        typeof textObject.text === "string" &&
        /[a-zA-Z]/.test(textObject.text) &&
        textObject.text === textObject.text.toUpperCase(),
      shadow: hasShadow,
      glow: hasGlow,
      curveMode: curveModeCandidate === "arcUp" || curveModeCandidate === "arcDown" || curveModeCandidate === "wave" ? curveModeCandidate : "none",
    }));
  };

  const updateBoundaryWarning = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();

    if (!activeObject) {
      setBoundaryWarning("");
      return;
    }

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const printableArea = {
      left: pxFromPercentage(canvasWidth, designAreaRef.current.x),
      top: pxFromPercentage(canvasHeight, designAreaRef.current.y),
      width: pxFromPercentage(canvasWidth, designAreaRef.current.width),
      height: pxFromPercentage(canvasHeight, designAreaRef.current.height),
    };

    const bounds = activeObject.getBoundingRect();
    const overflow = distanceFromPrintableArea(bounds, printableArea);

    if (overflow > 0) {
      setBoundaryWarning("Selected object is outside the printable area.");
      return;
    }

    setBoundaryWarning("");
  };

  const syncSelectedObject = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();

    setSelectedObjectType(getObjectType(activeObject) || "none");
    setSelectedLocked(isLockedObject(activeObject));

    if (isTextObject(activeObject)) {
      syncTextControlsFromObject(activeObject);
    }

    updateBoundaryWarning();
  };

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
    setAiSuggestions([]);

    const saved = viewsRef.current[view];
    if (saved?.objects?.length) {
      await canvas.loadFromJSON(saved);
    }

    canvas.renderAll();
    syncSelectedObject();
  };

  const applyTextCurve = (textObject: Textbox, mode: CurveMode, bendCurve: number) => {
    if (mode === "none") {
      textObject.set("path", undefined);
      (textObject as unknown as { __curveMode?: CurveMode }).__curveMode = "none";
      return;
    }

    const width = Math.max(Number(textObject.width) || 260, 160);
    const amplitude = Math.max(
      MIN_CURVE_AMPLITUDE,
      Math.min(MAX_CURVE_AMPLITUDE, Math.abs(bendCurve))
    );

    const curveByMode: Record<Exclude<CurveMode, "none">, string> = {
      arcUp: `M ${-width / 2} 0 Q 0 ${-amplitude} ${width / 2} 0`,
      arcDown: `M ${-width / 2} 0 Q 0 ${amplitude} ${width / 2} 0`,
      wave: `M ${-width / 2} 0 C ${-width / 4} ${-amplitude}, ${width / 4} ${amplitude}, ${width / 2} 0`,
    };

    const path = new Path(curveByMode[mode], { visible: false, strokeWidth: 0, fill: "" });
    textObject.set({ path, pathAlign: "center", pathSide: "left", pathStartOffset: 0 });
    (textObject as unknown as { __curveMode?: CurveMode }).__curveMode = mode;
  };

  const withActiveTextObject = (callback: (textObject: Textbox) => void) => {
    const activeObject = getCanvas()?.getActiveObject();
    if (!isTextObject(activeObject)) {
      setAiStatus("Select a text object first.");
      return;
    }

    callback(activeObject);
    activeObject.setCoords();
    getCanvas()?.requestRenderAll();
    syncTextControlsFromObject(activeObject);
    updateBoundaryWarning();
  };

  const applyTextControls = (next: TextControlsState) => {
    withActiveTextObject((textObject) => {
      const baseText = String(textObject.text || "");
      const nextText = next.uppercase ? baseText.toUpperCase() : baseText;

      let nextShadow: Shadow | undefined;
      if (next.glow) {
        nextShadow = new Shadow({ color: next.outlineColor || next.textColor, blur: 18, offsetX: 0, offsetY: 0, affectStroke: true });
      } else if (next.shadow) {
        nextShadow = new Shadow({ color: "rgba(0,0,0,0.45)", blur: 8, offsetX: 3, offsetY: 3, affectStroke: false });
      }

      textObject.set({
        text: nextText,
        fontFamily: next.fontFamily,
        fontSize: next.fontSize,
        fill: next.textColor,
        stroke: next.outlineColor,
        strokeWidth: next.outlineWidth,
        charSpacing: next.letterSpacing,
        fontWeight: next.bold ? "bold" : "normal",
        fontStyle: next.italic ? "italic" : "normal",
        shadow: nextShadow,
      });

      applyTextCurve(textObject, next.curveMode, next.bendCurve);
    });
  };

  const updateTextControls = (patch: Partial<TextControlsState>) => {
    setTextControls((prev) => {
      const next = { ...prev, ...patch };
      applyTextControls(next);
      return next;
    });
  };

  const replaceActiveImage = async (nextDataUrl: string) => {
    const canvas = getCanvas();
    if (!canvas) return false;
    const activeObject = canvas.getActiveObject();
    if (!isImageObject(activeObject)) return false;

    const index = canvas.getObjects().indexOf(activeObject);
    const replacement = await FabricImage.fromURL(nextDataUrl);

    replacement.set({
      left: activeObject.left,
      top: activeObject.top,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      angle: activeObject.angle,
      flipX: activeObject.flipX,
      flipY: activeObject.flipY,
      opacity: activeObject.opacity,
      skewX: activeObject.skewX,
      skewY: activeObject.skewY,
      lockMovementX: activeObject.lockMovementX,
      lockMovementY: activeObject.lockMovementY,
      lockScalingX: activeObject.lockScalingX,
      lockScalingY: activeObject.lockScalingY,
      lockRotation: activeObject.lockRotation,
    });

    canvas.remove(activeObject);
    if (index >= 0) {
      canvas.insertAt(index, replacement);
    } else {
      canvas.add(replacement);
    }

    canvas.setActiveObject(replacement);
    replacement.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
    return true;
  };

  const runAiRouteAction = async (route: string, actionName: string) => {
    const activeObject = getCanvas()?.getActiveObject();

    if (!isImageObject(activeObject)) {
      setAiStatus("Select an image first.");
      return;
    }

    try {
      setAiStatus(`${actionName}...`);
      const imageDataUrl = activeObject.toDataURL({ format: "png", multiplier: 1 });

      const response = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });

      const raw = await response.text();
      const result = raw ? (JSON.parse(raw) as AiActionResponse) : {};

      logAiDebug(actionName, {
        apiRoute: route,
        apiRouteResponse: result,
        status: response.status,
      });

      if (!response.ok || result.ok === false) {
        setAiStatus(result.error || `${actionName} failed.`);
        return;
      }

      const updatedImageUrl = typeof result.imageDataUrl === "string"
        ? result.imageDataUrl
        : typeof result.dataUrl === "string"
          ? result.dataUrl
          : "";

      if (updatedImageUrl) {
        const replaced = await replaceActiveImage(updatedImageUrl);
        setAiStatus(replaced ? result.note || `${actionName} complete.` : `${actionName} complete.`);
        logAiDebug(actionName, { updatedImageUrl });
        return;
      }

      setAiStatus(result.note || `${actionName} finished.`);
    } catch (error) {
      console.error(`${actionName} failed:`, error);
      setAiStatus(`${actionName} failed.`);
    }
  };

  const removeWhiteBackgroundLocally = async () => {
    const activeObject = getCanvas()?.getActiveObject();
    if (!isImageObject(activeObject)) {
      setAiStatus("Select an image first.");
      return;
    }

    try {
      setAiStatus("Removing white background...");
      const sourceDataUrl = activeObject.toDataURL({ format: "png", multiplier: 1 });

      const imageElement = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Unable to load selected image."));
        img.src = sourceDataUrl;
      });

      const workCanvas = document.createElement("canvas");
      workCanvas.width = imageElement.width;
      workCanvas.height = imageElement.height;

      const context = workCanvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        setAiStatus("Remove White Background is not available in this browser.");
        return;
      }

      context.drawImage(imageElement, 0, 0);
      const imageData = context.getImageData(0, 0, workCanvas.width, workCanvas.height);
      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];

        const nearWhite =
          red > NEAR_WHITE_THRESHOLD &&
          green > NEAR_WHITE_THRESHOLD &&
          blue > NEAR_WHITE_THRESHOLD;
        const softWhite =
          red > SOFT_WHITE_THRESHOLD &&
          green > SOFT_WHITE_THRESHOLD &&
          blue > SOFT_WHITE_THRESHOLD;

        if (nearWhite) {
          pixels[i + 3] = 0;
        } else if (softWhite) {
          const average = (red + green + blue) / 3;
          pixels[i + 3] = Math.max(
            0,
            Math.min(255, 255 - (average - SOFT_WHITE_THRESHOLD) * 6)
          );
        }
      }

      context.putImageData(imageData, 0, 0);
      const cleanedDataUrl = workCanvas.toDataURL("image/png");
      const replaced = await replaceActiveImage(cleanedDataUrl);

      setAiStatus(replaced ? "White background removed locally." : "White background cleanup complete.");
      logAiDebug("Remove White Background", {
        updatedImageUrl: cleanedDataUrl,
      });
    } catch (error) {
      console.error("Remove White Background failed:", error);
      setAiStatus("Remove White Background failed.");
    }
  };

  const generateLocalSuggestions = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const suggestions = [
      "Increase contrast for better print visibility",
      "Keep design inside printable area",
      "Add outline for dark garments",
      "Use larger text for readability",
      "Center design in print area",
    ];

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      const printableArea = {
        left: pxFromPercentage(canvasWidth, designAreaRef.current.x),
        top: pxFromPercentage(canvasHeight, designAreaRef.current.y),
        width: pxFromPercentage(canvasWidth, designAreaRef.current.width),
        height: pxFromPercentage(canvasHeight, designAreaRef.current.height),
      };
      const overflow = distanceFromPrintableArea(activeObject.getBoundingRect(), printableArea);
      if (overflow > 0) {
        suggestions.unshift("Move artwork back inside printable area for best print result.");
      }
    }

    setAiSuggestions(suggestions);
    setAiStatus("Design suggestions ready.");
    logAiDebug("Suggest Design Improvements", { suggestions });
  };

  const generateDesignIdea = async () => {
    const prompt = designIdeaPrompt.trim();

    if (!prompt) {
      setAiStatus("Describe your design idea first.");
      return;
    }

    try {
      setAiStatus("Generating design idea...");
      const response = await fetch("/api/ai/generate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const raw = await response.text();
      const result = raw ? (JSON.parse(raw) as AiActionResponse) : {};

      logAiDebug("Generate Idea", {
        apiRoute: "/api/ai/generate-design",
        apiRouteResponse: result,
        status: response.status,
      });

      if (!response.ok || result.ok === false) {
        setAiStatus(result.error || "AI design generation is not configured yet.");
        return;
      }

      setAiStatus(result.note || "Design idea generated.");
      if (result.suggestions?.length) {
        setAiSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error("Generate idea failed:", error);
      setAiStatus("AI design generation is not configured yet.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawVariant = params.get("variant") || params.get("variantId") || params.get("variant_id");
    const normalized = normalizeVariantId(rawVariant);
    const handleFromUrl = params.get("product") || params.get("handle") || "";
    const debugFlag = params.get("debugMockup") || params.get("debug");
    const debugEnabled = debugFlag === "1" || debugFlag === "true";
    const debugAiFlag = params.get("debugAI");

    setHasVariantInQuery(Boolean(normalized));
    setVariantId(normalized || FALLBACK_VARIANT_ID);
    setSelectedSize(params.get("size") || "Custom");
    setTransferSize(params.get("transferSize") || params.get("transfer_size") || "12x12");
    setProductHandle(handleFromUrl);
    setShouldDebugLog(debugEnabled);
    setShouldDebugAiLog(debugAiFlag === "1" || debugAiFlag === "true");
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type !== "dtf:shopify-context") return;
      const payload = message.payload || {};

      const nextVariantId = normalizeVariantId(payload.variantId);
      const nextProductHandle =
        typeof payload.productHandle === "string" ? payload.productHandle.trim() : "";

      if (nextVariantId && !hasVariantInQuery) {
        setVariantId(nextVariantId);
      }

      if (nextProductHandle) {
        setProductHandle(nextProductHandle);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hasVariantInQuery]);

  useEffect(() => {
    if (!productHandle) return;

    let isMounted = true;
    const controller = new AbortController();

    const fetchProductByHandle = async () => {
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productHandle)}`, { signal: controller.signal });
        const raw = await response.text();
        let result = {} as ProductByHandleApiResponse;

        if (raw) {
          try {
            result = JSON.parse(raw) as ProductByHandleApiResponse;
          } catch (parseError) {
            throw new Error(
              `Invalid product API response JSON (${response.status}): ${String(
                parseError
              )}`
            );
          }
        }

        if (!response.ok) {
          throw new Error(result.error || `Failed to load product (${response.status}).`);
        }

        if (!isMounted) return;

        const metafieldValue = result.metafield?.value;
        const parsedLocations = parsePrintLocations(metafieldValue);
        setPrintLocations(parsedLocations);
        if (!metafieldValue || !hasMetafieldLocationData(parsedLocations)) {
          setPrintLocationsError(
            "DTF print preview setup is missing. Configure product metafield dtf.print_locations to continue."
          );
        } else {
          setPrintLocationsError("");
        }

        if (!hasVariantInQuery && result.variants?.[0]?.id) {
          const fallbackVariant = normalizeVariantId(result.variants[0].id);
          if (fallbackVariant) setVariantId(fallbackVariant);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch product by handle:", error);
        if (isMounted) {
          setPrintLocationsError(
            "Unable to load DTF print preview settings for this product. Please try again."
          );
        }
      }
    };

    fetchProductByHandle();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [hasVariantInQuery, productHandle]);

  const locationInfo = getPrintLocationDataForView(printLocations, currentView);
  const { activeLocation, activeLocationData } = locationInfo;
  const mockupUrl = activeLocationData?.mockupUrl;
  const designArea = normalizeDesignArea(activeLocationData);
  const maxPrintWidth = normalizePrintLimit(activeLocationData?.maxPrintWidth);
  const maxPrintHeight = normalizePrintLimit(activeLocationData?.maxPrintHeight);
  const availableViews = getAvailableViews(printLocations);
  const transferDimensions = parseTransferSize(transferSize);
  const exceedsPrintWidth = Boolean(maxPrintWidth && transferDimensions && transferDimensions.width > maxPrintWidth);
  const exceedsPrintHeight = Boolean(maxPrintHeight && transferDimensions && transferDimensions.height > maxPrintHeight);
  const exceedsPrintLimits = exceedsPrintWidth || exceedsPrintHeight;
  const isAddToCartDisabled = isSubmitting || Boolean(printLocationsError) || exceedsPrintLimits;
  const addToCartDescriptionId = printLocationsError
    ? "print-locations-error"
    : exceedsPrintLimits
      ? "print-limit-warning"
      : undefined;

  useEffect(() => {
    if (!availableViews.length || availableViews.includes(currentView)) return;
    setCurrentView(availableViews[0]);
  }, [availableViews, currentView]);

  useEffect(() => {
    designAreaRef.current = designArea;
  }, [designArea]);

  useEffect(() => {
    shouldDebugAiLogRef.current = shouldDebugAiLog;
  }, [shouldDebugAiLog]);

  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new Canvas(canvasElRef.current, {
      width: CANVAS_DEFAULT_WIDTH,
      height: CANVAS_DEFAULT_HEIGHT,
      backgroundColor: "transparent",
    });

    fabricCanvasRef.current = canvas;

    const handleSelection = () => {
      syncSelectedObject();
      if (shouldDebugAiLogRef.current) {
        const activeObject = canvas.getActiveObject();
        console.log("[AI DEBUG]", {
          selectedObject: activeObject,
          selectedObjectType: getObjectType(activeObject) || "none",
        });
      }
    };

    const handleObjectChange = () => {
      updateBoundaryWarning();
    };

    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleSelection);
    canvas.on("object:moving", handleObjectChange);
    canvas.on("object:scaling", handleObjectChange);
    canvas.on("object:modified", handleObjectChange);

    setIsReady(true);

    return () => {
      canvas.off("selection:created", handleSelection);
      canvas.off("selection:updated", handleSelection);
      canvas.off("selection:cleared", handleSelection);
      canvas.off("object:moving", handleObjectChange);
      canvas.off("object:scaling", handleObjectChange);
      canvas.off("object:modified", handleObjectChange);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shouldDebugLog) return;
    console.log("productHandle", productHandle);
    console.log("printLocations", printLocations);
    console.log("activeLocation", activeLocation);
    console.log("activeLocationData", printLocations?.[activeLocation]);
    console.log("mockupUrl", printLocations?.[activeLocation]?.mockupUrl);
  }, [activeLocation, printLocations, productHandle, shouldDebugLog]);

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
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        const areaLeft = pxFromPercentage(canvasWidth, designArea.x);
        const areaTop = pxFromPercentage(canvasHeight, designArea.y);
        const areaWidth = pxFromPercentage(canvasWidth, designArea.width);
        const areaHeight = pxFromPercentage(canvasHeight, designArea.height);

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
        syncSelectedObject();
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
      fill: textControls.textColor,
      stroke: textControls.outlineColor,
      strokeWidth: textControls.outlineWidth,
      fontSize: textControls.fontSize,
      fontFamily: textControls.fontFamily,
      width: 250,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    syncSelectedObject();
  };

  const withActiveObject = (
    callback: (obj: Parameters<Canvas["centerObject"]>[0]) => void
  ) => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    callback(activeObject);
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncSelectedObject();
  };

  const removeSelected = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    syncSelectedObject();
  };

  const duplicateSelected = async () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const clone = await activeObject.clone();
    clone.set({ left: (activeObject.left || 0) + 20, top: (activeObject.top || 0) + 20 });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
    syncSelectedObject();
  };

  const centerSelected = () => {
    withActiveObject((obj) => {
      const canvas = getCanvas();
      if (!canvas) return;
      canvas.centerObject(obj);
    });
  };

  const toggleLockSelected = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const current = isLockedObject(obj);
      const target = !current;
      const mutable = obj as {
        lockMovementX?: boolean;
        lockMovementY?: boolean;
        lockScalingX?: boolean;
        lockScalingY?: boolean;
        lockRotation?: boolean;
        selectable?: boolean;
      };

      mutable.lockMovementX = target;
      mutable.lockMovementY = target;
      mutable.lockScalingX = target;
      mutable.lockScalingY = target;
      mutable.lockRotation = target;
      mutable.selectable = true;
    });
  };

  const flipHorizontal = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const mutable = obj as { flipX?: boolean };
      mutable.flipX = !Boolean(mutable.flipX);
    });
  };

  const flipVertical = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const mutable = obj as { flipY?: boolean };
      mutable.flipY = !Boolean(mutable.flipY);
    });
  };

  const rotateSelected = () => {
    withActiveObject((obj) => {
      if (!obj || typeof obj !== "object") return;
      const mutable = obj as { angle?: number };
      mutable.angle = (mutable.angle || 0) + 15;
    });
  };

  const bringForward = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;
    canvas.bringObjectForward(activeObject);
    canvas.requestRenderAll();
  };

  const sendBackward = () => {
    const canvas = getCanvas();
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject) return;
    canvas.sendObjectBackwards(activeObject);
    canvas.requestRenderAll();
  };

  const exportCurrentViewBlob = async () => {
    const canvas = getCanvas();
    if (!canvas) return null;

    saveCurrentView();
    const renderedCanvas = canvas.lowerCanvasEl;
    if (!renderedCanvas) return null;

    return new Promise<Blob | null>((resolve) => {
      renderedCanvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const uploadPreviewImage = async () => {
    const blob = await exportCurrentViewBlob();
    if (!blob) throw new Error("Preview image could not be generated.");

    const formData = new FormData();
    formData.append("file", blob, `dtf-${currentView}.png`);

    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = (await response.json()) as UploadResponse;

    if (!response.ok || !result.url) {
      throw new Error(result.error || "Artwork upload failed.");
    }

    return result.url;
  };

  const handleAddToCart = async () => {
    if (printLocationsError) {
      setCartStatus(printLocationsError);
      return;
    }

    if (exceedsPrintLimits) {
      setCartStatus("Selected transfer size exceeds this location's print size limit.");
      return;
    }

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
        alert("Artwork upload is not complete. Please wait and try again.");
        setCartStatus("");
        return;
      }

      const normalizedTransferSize = TRANSFER_SIZE_PRESETS.includes(transferSize)
        ? transferSize
        : "Custom";

      const payload = {
        id: numericId,
        quantity: Number(quantity || 1),
        properties: {
          "Design ID": createDesignId(),
          Size: selectedSize || "Custom",
          "Transfer Size": normalizedTransferSize,
          Placement: VIEW_LABELS[currentView],
          "Print Location": activeLocation,
          "Artwork URL": uploadedArtworkUrl,
          "Preview URL": uploadedArtworkUrl,
          "Mockup URL": mockupUrl || "",
          "Max Print Width (in)": maxPrintWidth ?? "",
          "Max Print Height (in)": maxPrintHeight ?? "",
          "Boundary Warning": boundaryWarning || "None",
        },
      };

      window.parent.postMessage({ type: "DTF_ADD_TO_CART", data: payload }, SHOPIFY_PARENT_ORIGIN);
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

    const dataURL = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `DTF-Print-${currentView}.png`;
    link.click();
  };

  return (
    <div className="flex min-h-screen bg-[#0e0e0e] text-white">
      <aside className="w-[360px] shrink-0 overflow-y-auto border-r border-[#222] bg-[#111] p-5">
        <h1 className="text-xl font-bold">DTF Designer Pro</h1>
        <p className="mt-1 text-sm text-gray-400">
          Upload artwork, add text, design print areas, and send custom design details to Shopify checkout.
        </p>

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Upload Artwork</h2>
          <input id="artwork-upload-input" name="artworkUpload" ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="block w-full cursor-pointer rounded bg-[#1f1f1f] p-2 text-sm text-white hover:bg-[#333]">Upload Artwork</button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
          <button type="button" onClick={addText} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Add Text</button>
          <button type="button" onClick={duplicateSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Duplicate</button>
          <button type="button" onClick={centerSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Center</button>
          <button type="button" onClick={toggleLockSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">{selectedLocked ? "Unlock" : "Lock"}</button>
          <button type="button" onClick={flipHorizontal} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Flip H</button>
          <button type="button" onClick={flipVertical} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Flip V</button>
          <button type="button" onClick={removeSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Delete</button>
          <button type="button" onClick={rotateSelected} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Rotate</button>
          <button type="button" onClick={bringForward} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Bring Forward</button>
          <button type="button" onClick={sendBackward} className="rounded bg-[#1f1f1f] px-3 py-2 text-left hover:bg-[#333]">Send Backward</button>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Text & Font Customization</h2>
          <p className="mb-3 text-xs text-gray-400">Selected object: {selectedObjectType}</p>

          <label htmlFor="font-family-select" className="mb-1 block text-xs text-gray-300">Font</label>
          <select id="font-family-select" name="fontFamily" value={textControls.fontFamily} onChange={(e) => updateTextControls({ fontFamily: e.target.value })} className="mb-2 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm">
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Impact">Impact</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
          </select>

          <label htmlFor="font-size-range" className="mb-1 block text-xs text-gray-300">Font Size</label>
          <div className="mb-2 flex gap-2">
            <input id="font-size-range" name="fontSizeRange" type="range" min={10} max={220} value={textControls.fontSize} onChange={(e) => updateTextControls({ fontSize: Number(e.target.value) })} className="w-full" aria-label="Font Size Slider" />
            <label htmlFor="font-size-input" className="sr-only">Font Size Value</label>
            <input id="font-size-input" name="fontSize" type="number" min={10} max={220} value={textControls.fontSize} onChange={(e) => updateTextControls({ fontSize: Number(e.target.value) || 32 })} className="w-20 rounded bg-[#1f1f1f] px-2 py-1 text-sm" aria-label="Font Size" />
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <label htmlFor="text-color-input" className="text-xs text-gray-300">Text Color
              <input id="text-color-input" name="textColor" type="color" value={textControls.textColor} onChange={(e) => updateTextControls({ textColor: e.target.value })} className="mt-1 h-9 w-full rounded bg-[#1f1f1f]" />
            </label>
            <label htmlFor="outline-color-input" className="text-xs text-gray-300">Outline Color
              <input id="outline-color-input" name="outlineColor" type="color" value={textControls.outlineColor} onChange={(e) => updateTextControls({ outlineColor: e.target.value })} className="mt-1 h-9 w-full rounded bg-[#1f1f1f]" />
            </label>
          </div>

          <label htmlFor="outline-width-range" className="mb-1 block text-xs text-gray-300">Outline Width</label>
          <input id="outline-width-range" name="outlineWidth" type="range" min={0} max={20} value={textControls.outlineWidth} onChange={(e) => updateTextControls({ outlineWidth: Number(e.target.value) })} className="mb-2 w-full" />

          <label htmlFor="letter-spacing-range" className="mb-1 block text-xs text-gray-300">Letter Spacing</label>
          <input id="letter-spacing-range" name="letterSpacing" type="range" min={-200} max={800} step={10} value={textControls.letterSpacing} onChange={(e) => updateTextControls({ letterSpacing: Number(e.target.value) })} className="mb-3 w-full" />

          <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ bold: !textControls.bold })} className={`rounded px-2 py-2 ${textControls.bold ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Bold</button>
            <button type="button" onClick={() => updateTextControls({ italic: !textControls.italic })} className={`rounded px-2 py-2 ${textControls.italic ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Italic</button>
            <button type="button" onClick={() => updateTextControls({ uppercase: !textControls.uppercase })} className={`rounded px-2 py-2 ${textControls.uppercase ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Uppercase</button>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ shadow: !textControls.shadow, glow: textControls.shadow ? textControls.glow : false })} className={`rounded px-2 py-2 ${textControls.shadow ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Shadow</button>
            <button type="button" onClick={() => updateTextControls({ glow: !textControls.glow, shadow: textControls.glow ? textControls.shadow : false })} className={`rounded px-2 py-2 ${textControls.glow ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Glow</button>
          </div>

          <div className="mb-2 grid grid-cols-3 gap-2 text-xs">
            <button type="button" onClick={() => updateTextControls({ curveMode: "arcUp" })} className={`rounded px-2 py-2 ${textControls.curveMode === "arcUp" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Arc Up</button>
            <button type="button" onClick={() => updateTextControls({ curveMode: "arcDown" })} className={`rounded px-2 py-2 ${textControls.curveMode === "arcDown" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Arc Down</button>
            <button type="button" onClick={() => updateTextControls({ curveMode: "wave" })} className={`rounded px-2 py-2 ${textControls.curveMode === "wave" ? "bg-white text-black" : "bg-[#1f1f1f]"}`}>Wave</button>
          </div>

          <label htmlFor="bend-curve-range" className="mb-1 block text-xs text-gray-300">Bend / Curve</label>
          <div className="mb-1 flex gap-2">
            <input id="bend-curve-range" name="bendCurveRange" type="range" min={5} max={200} value={textControls.bendCurve} onChange={(e) => updateTextControls({ bendCurve: Number(e.target.value) })} className="w-full" aria-label="Bend Curve Slider" />
            <label htmlFor="bend-curve-input" className="sr-only">Bend Curve Value</label>
            <input id="bend-curve-input" name="bendCurve" type="number" min={5} max={200} value={textControls.bendCurve} onChange={(e) => updateTextControls({ bendCurve: Number(e.target.value) || 25 })} className="w-20 rounded bg-[#1f1f1f] px-2 py-1 text-sm" aria-label="Bend Curve" />
          </div>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">AI Design Tools</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={() => runAiRouteAction("/api/ai/remove-background", "Remove Background")} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Background Remover">Remove Background</button>
            <button type="button" onClick={() => runAiRouteAction("/api/ai/enhance-image", "Enhance Image")} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Image Enhancer">Enhance Image</button>
            <button type="button" onClick={() => runAiRouteAction("/api/ai/upscale", "Upscale / Sharpen")} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Upscale / Sharpen">Upscale / Sharpen</button>
            <button type="button" onClick={() => runAiRouteAction("/api/ai/vectorize", "Vectorize Artwork")} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Vectorize">Vectorize Artwork</button>
            <button type="button" onClick={() => runAiRouteAction("/api/ai/color-cleanup", "Clean Up Colors")} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Color Cleanup">Clean Up Colors</button>
            <button type="button" onClick={removeWhiteBackgroundLocally} className="rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Remove White Background">Remove White Background</button>
            <button type="button" onClick={generateLocalSuggestions} className="col-span-2 rounded bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#333]" title="AI Design Suggestions">Suggest Design Improvements</button>
          </div>

          <div className="mt-3 rounded border border-[#2b2b2b] bg-[#111] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300">Design Idea</h3>
            <label htmlFor="design-idea-input" className="sr-only">Design idea prompt</label>
            <input id="design-idea-input" name="designIdeaPrompt" type="text" value={designIdeaPrompt} onChange={(e) => setDesignIdeaPrompt(e.target.value)} placeholder="Describe your design style and key elements" className="mb-2 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm" />
            <button type="button" onClick={generateDesignIdea} className="w-full rounded bg-[#1f1f1f] px-2 py-2 text-left text-xs hover:bg-[#333]" title="AI Generate Design Idea">Generate Idea</button>
          </div>

          {aiStatus ? <p className="mt-3 text-xs text-gray-300">{aiStatus}</p> : null}
          {aiSuggestions.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-gray-300">
              {aiSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
            </ul>
          ) : null}
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Transfer Size Preview</h2>
          <label htmlFor="transfer-size-select" className="sr-only">Transfer size</label>
          <select id="transfer-size-select" name="transferSize" value={transferSize} onChange={(e) => setTransferSize(e.target.value)} className="mb-3 w-full rounded bg-[#1f1f1f] px-2 py-2 text-sm">
            {TRANSFER_SIZE_PRESETS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <p className="text-xs text-gray-400">Live transfer size: <span className="font-semibold text-white">{transferSize}</span></p>
          {(maxPrintWidth || maxPrintHeight) ? (
            <p className="mt-2 text-xs text-gray-400">
              Max print size: <span className="font-semibold text-white">{maxPrintWidth ?? "—"} in × {maxPrintHeight ?? "—"} in</span>
            </p>
          ) : null}
          {exceedsPrintLimits ? <p id="print-limit-warning" role="alert" aria-live="polite" className="mt-2 text-xs text-yellow-300">⚠ Selected transfer size exceeds this location&apos;s print size limit.</p> : null}
          {boundaryWarning ? <p className="mt-2 text-xs text-yellow-300">⚠ {boundaryWarning}</p> : null}
        </div>

        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-300">Print Areas</h2>
          <div className="grid gap-2">
            {availableViews.map((view) => (
              <button key={view} type="button" onClick={() => loadView(view)} className={`rounded px-4 py-3 text-left ${currentView === view ? "bg-white text-black" : "bg-[#1f1f1f] hover:bg-[#333]"}`}>{VIEW_LABELS[view]}</button>
            ))}
          </div>
          {!availableViews.length ? <p className="mt-2 text-xs text-gray-400">No print locations are configured for this product.</p> : null}
        </div>

        <div className="mt-5">
          <button type="button" onClick={downloadDesign} className="w-full rounded bg-[#1f1f1f] px-4 py-3 text-left hover:bg-[#333]">Download Print File</button>
        </div>

        <div className="mt-5 rounded border border-[#2b2b2b] bg-[#171717] p-4">
          <h2 className="mb-2 text-lg font-semibold">Checkout</h2>
          <label htmlFor="checkout-size-input" className="mb-2 block text-sm text-gray-300">Size</label>
          <input id="checkout-size-input" name="size" type="text" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />

          <label htmlFor="checkout-quantity-input" className="mb-2 block text-sm text-gray-300">Quantity</label>
          <input id="checkout-quantity-input" name="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />

          <button type="button" onClick={handleAddToCart} disabled={isAddToCartDisabled} aria-describedby={addToCartDescriptionId} className="w-full rounded bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500">{isSubmitting ? "Uploading..." : "Add Custom Design to Cart"}</button>
          {cartStatus ? <p className="mt-3 text-sm text-gray-300">{cartStatus}</p> : null}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex h-[60px] items-center border-b border-[#222] bg-[#111] px-5">
          <span className="text-sm text-gray-300">Current view: <strong className="text-white">{VIEW_LABELS[currentView]}</strong></span>
          {!isReady && <span className="ml-4 text-sm text-yellow-400">Loading canvas...</span>}
        </div>
        {printLocationsError ? (
          <div id="print-locations-error" role="alert" aria-live="polite" className="border-b border-red-700 bg-red-950 px-6 py-3 text-sm text-red-200">
            {printLocationsError}
          </div>
        ) : null}

        <div className="flex flex-1 items-center justify-center bg-[#181818] p-6">
          <div className="relative overflow-hidden rounded border border-[#333] bg-white shadow-2xl" style={{ width: `${CANVAS_DEFAULT_WIDTH}px`, height: `${CANVAS_DEFAULT_HEIGHT}px` }}>
            {mockupUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mockupUrl} alt={`${VIEW_LABELS[currentView]} mockup`} className="absolute inset-0 z-0 h-full w-full object-contain" />
            ) : (
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-[#f3f3f3] text-sm font-medium text-gray-500">No mockup configured for this location</div>
            )}
            <div className="pointer-events-none absolute z-20 border border-dashed border-cyan-400" style={{ left: `${designArea.x}%`, top: `${designArea.y}%`, width: `${designArea.width}%`, height: `${designArea.height}%` }} />
            <canvas ref={canvasElRef} className="relative z-10" />
          </div>
        </div>
      </main>
    </div>
  );
}
