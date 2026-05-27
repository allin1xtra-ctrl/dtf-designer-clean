"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Rnd } from "react-rnd";

const STAGE_WIDTH = 500;
const STAGE_HEIGHT = 600;
const LOCATION_KEYS = ["front", "back", "left_sleeve", "right_sleeve", "neck_tag"] as const;
const COLOR_VARIANT_NAMES = ["Black", "White", "Red", "Navy", "Gray"] as const;

type LocationKey = (typeof LOCATION_KEYS)[number];

type DesignArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PrintLocationConfig = {
  mockupUrl: string;
  colorMockups?: Record<string, string>;
  designArea: DesignArea;
  maxPrintWidth: number;
  maxPrintHeight: number;
};

type PrintLocationsMap = Record<LocationKey, PrintLocationConfig>;

type Product = {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {
    url?: string | null;
  } | null;
  variants?: Array<{
    id: string;
    title: string;
  }>;
  metafield?: {
    value?: string;
    type?: string;
  } | null;
};

type DesignRectPx = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const LOCATION_LABELS: Record<LocationKey, string> = {
  front: "Front",
  back: "Back",
  left_sleeve: "Left Sleeve",
  right_sleeve: "Right Sleeve",
  neck_tag: "Neck Label",
};

const LOCATION_ALIASES: Record<LocationKey, string[]> = {
  front: ["front"],
  back: ["back"],
  left_sleeve: ["left_sleeve", "leftSleeve"],
  right_sleeve: ["right_sleeve", "rightSleeve"],
  neck_tag: ["neck_tag", "neckLabel", "neck_label", "neck"],
};

const DEFAULT_PRINT_LOCATIONS: PrintLocationsMap = {
  front: {
    mockupUrl: "",
    designArea: { x: 0.32, y: 0.22, width: 0.36, height: 0.42 },
    maxPrintWidth: 12,
    maxPrintHeight: 16,
  },
  back: {
    mockupUrl: "",
    designArea: { x: 0.32, y: 0.2, width: 0.36, height: 0.45 },
    maxPrintWidth: 12,
    maxPrintHeight: 16,
  },
  left_sleeve: {
    mockupUrl: "",
    designArea: { x: 0.35, y: 0.35, width: 0.3, height: 0.28 },
    maxPrintWidth: 4,
    maxPrintHeight: 5,
  },
  right_sleeve: {
    mockupUrl: "",
    designArea: { x: 0.35, y: 0.35, width: 0.3, height: 0.28 },
    maxPrintWidth: 4,
    maxPrintHeight: 5,
  },
  neck_tag: {
    mockupUrl: "",
    designArea: { x: 0.34, y: 0.34, width: 0.32, height: 0.18 },
    maxPrintWidth: 3,
    maxPrintHeight: 3,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundDecimal(value: number) {
  return Number(value.toFixed(4));
}

function parseObject(value: string | undefined) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {}
  return {};
}

function readNumber(value: unknown, fallback: number, percentAsDecimal = false) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (percentAsDecimal && n >= 0 && n <= 100) return n / 100;
  return n;
}

function resolveLocation(
  source: Record<string, unknown>,
  key: LocationKey,
  featuredImageUrl: string
): PrintLocationConfig {
  const defaults = DEFAULT_PRINT_LOCATIONS[key];
  let raw: Record<string, unknown> = {};

  for (const alias of LOCATION_ALIASES[key]) {
    const candidate = source[alias];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      raw = candidate as Record<string, unknown>;
      break;
    }
  }

  const nestedArea =
    raw.designArea && typeof raw.designArea === "object" && !Array.isArray(raw.designArea)
      ? (raw.designArea as Record<string, unknown>)
      : {};

  const rawX = raw.x ?? nestedArea.x;
  const rawY = raw.y ?? nestedArea.y;
  const rawWidth = raw.width ?? nestedArea.width;
  const rawHeight = raw.height ?? nestedArea.height;

  let x = readNumber(rawX, defaults.designArea.x);
  let y = readNumber(rawY, defaults.designArea.y);
  let width = readNumber(rawWidth, defaults.designArea.width);
  let height = readNumber(rawHeight, defaults.designArea.height);

  if (x > 1 || y > 1 || width > 1 || height > 1) {
    x = readNumber(rawX, defaults.designArea.x, true);
    y = readNumber(rawY, defaults.designArea.y, true);
    width = readNumber(rawWidth, defaults.designArea.width, true);
    height = readNumber(rawHeight, defaults.designArea.height, true);
  }

  const rawColorMockups =
    raw.colorMockups && typeof raw.colorMockups === "object" && !Array.isArray(raw.colorMockups)
      ? Object.fromEntries(
          Object.entries(raw.colorMockups as Record<string, unknown>).flatMap(([color, url]) => {
            const normalizedColor = String(color || "").trim();
            const normalizedUrl = String(url || "").trim();
            return normalizedColor && normalizedUrl ? [[normalizedColor, normalizedUrl]] : [];
          })
        )
      : undefined;

  return {
    mockupUrl:
      String(raw.mockupUrl || "").trim() || defaults.mockupUrl || String(featuredImageUrl || "").trim(),
    colorMockups:
      rawColorMockups && Object.keys(rawColorMockups).length ? rawColorMockups : undefined,
    designArea: {
      x: clamp(x, 0, 1),
      y: clamp(y, 0, 1),
      width: clamp(width, 0.01, 1),
      height: clamp(height, 0.01, 1),
    },
    maxPrintWidth: Math.max(0.1, readNumber(raw.maxPrintWidth, defaults.maxPrintWidth)),
    maxPrintHeight: Math.max(0.1, readNumber(raw.maxPrintHeight, defaults.maxPrintHeight)),
  };
}

function mapDesignAreaToPx(designArea: DesignArea): DesignRectPx {
  return {
    x: designArea.x * STAGE_WIDTH,
    y: designArea.y * STAGE_HEIGHT,
    width: designArea.width * STAGE_WIDTH,
    height: designArea.height * STAGE_HEIGHT,
  };
}

function mapPxToDesignArea(rect: DesignRectPx): DesignArea {
  return {
    x: roundDecimal(clamp(rect.x / STAGE_WIDTH, 0, 1)),
    y: roundDecimal(clamp(rect.y / STAGE_HEIGHT, 0, 1)),
    width: roundDecimal(clamp(rect.width / STAGE_WIDTH, 0.01, 1)),
    height: roundDecimal(clamp(rect.height / STAGE_HEIGHT, 0.01, 1)),
  };
}

function getSafeImageUrl(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return trimmed;
    }
  } catch {}
  return "";
}

function AdminMockupManagerContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationKey>("front");
  const [printLocations, setPrintLocations] = useState<PrintLocationsMap>(DEFAULT_PRINT_LOCATIONS);
  const [designRectPx, setDesignRectPx] = useState<DesignRectPx>(mapDesignAreaToPx(DEFAULT_PRINT_LOCATIONS.front.designArea));
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );
  const activeConfig = printLocations[selectedLocation];
  const previewImageUrl = getSafeImageUrl(
    activeConfig?.mockupUrl || selectedProduct?.featuredImage?.url || ""
  );

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;
    setIsLoadingProducts(true);
    setProductsError("");
    setIsUnauthorized(false);

    fetch(`/api/admin/products?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { products?: Product[]; error?: string };
        if (isCancelled) return;

        if (res.status === 401) {
          setIsUnauthorized(true);
          return;
        }

        if (!res.ok) {
          setProductsError(data.error || "Failed to load products.");
          return;
        }

        const productList = Array.isArray(data.products) ? data.products : [];
        setProducts(productList);
        if (productList.length) setSelectedProductId(productList[0].id);
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setProductsError(message || "Failed to load products.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingProducts(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedProduct) {
      setPrintLocations(DEFAULT_PRINT_LOCATIONS);
      setSelectedLocation("front");
      return;
    }

    const source = parseObject(selectedProduct.metafield?.value);
    const featuredImageUrl = String(selectedProduct.featuredImage?.url || "").trim();
    const nextLocations: PrintLocationsMap = {
      front: resolveLocation(source, "front", featuredImageUrl),
      back: resolveLocation(source, "back", featuredImageUrl),
      left_sleeve: resolveLocation(source, "left_sleeve", featuredImageUrl),
      right_sleeve: resolveLocation(source, "right_sleeve", featuredImageUrl),
      neck_tag: resolveLocation(source, "neck_tag", featuredImageUrl),
    };

    setPrintLocations(nextLocations);
    setSelectedLocation("front");
    setSaveStatus("");
  }, [selectedProduct]);

  useEffect(() => {
    setDesignRectPx(mapDesignAreaToPx(activeConfig.designArea));
  }, [activeConfig.designArea, selectedLocation]);

  function updateLocationConfig(patch: Partial<PrintLocationConfig>) {
    setPrintLocations((prev) => ({
      ...prev,
      [selectedLocation]: {
        ...prev[selectedLocation],
        ...patch,
      },
    }));
  }

  function updateDesignAreaFromPx(nextRect: DesignRectPx) {
    const clampedRect: DesignRectPx = {
      x: clamp(nextRect.x, 0, STAGE_WIDTH - nextRect.width),
      y: clamp(nextRect.y, 0, STAGE_HEIGHT - nextRect.height),
      width: clamp(nextRect.width, 20, STAGE_WIDTH),
      height: clamp(nextRect.height, 20, STAGE_HEIGHT),
    };
    setDesignRectPx(clampedRect);
    updateLocationConfig({ designArea: mapPxToDesignArea(clampedRect) });
  }

  async function handleSave() {
    if (!selectedProduct || !token) return;
    setIsSaving(true);
    setSaveStatus("");

    try {
      const response = await fetch("/api/admin/product-print-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          productId: selectedProduct.id,
          printLocations,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 401) {
        setIsUnauthorized(true);
        return;
      }

      if (!response.ok) {
        setSaveStatus(data.error || "Failed to save print locations.");
        return;
      }

      setSaveStatus("Saved successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveStatus(message || "Failed to save print locations.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isUnauthorized) {
  return (
    <main className="min-h-screen bg-[#0f0f10] p-8 text-white">
      <h1 className="text-2xl font-semibold">
        Admin API Unauthorized
      </h1>
    </main>
  );
}

  return (
    <main className="min-h-screen bg-[#0f0f10] text-white">
      <div className="mx-auto flex max-w-[1280px] gap-6 p-6">
        <section className="w-full max-w-[380px] rounded-lg border border-[#232323] bg-[#151515] p-5">
          <h1 className="mb-5 text-xl font-semibold">Admin Mockup Manager</h1>

          <label htmlFor="admin-product-select" className="mb-2 block text-sm text-gray-300">
            Shopify Product
          </label>
          <select
            id="admin-product-select"
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className="mb-4 w-full rounded border border-[#2b2b2b] bg-[#1f1f1f] px-3 py-2 text-white"
            disabled={isLoadingProducts}
          >
            {!products.length ? <option value="">{isLoadingProducts ? "Loading products..." : "No products found"}</option> : null}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>

          <label htmlFor="admin-location-select" className="mb-2 block text-sm text-gray-300">
            Print Location
          </label>
          <select
            id="admin-location-select"
            value={selectedLocation}
            onChange={(event) => setSelectedLocation(event.target.value as LocationKey)}
            className="mb-4 w-full rounded border border-[#2b2b2b] bg-[#1f1f1f] px-3 py-2 text-white"
          >
            {LOCATION_KEYS.map((locationKey) => (
              <option key={locationKey} value={locationKey}>
                {LOCATION_LABELS[locationKey]}
              </option>
            ))}
          </select>

          <label htmlFor="admin-mockup-url" className="mb-2 block text-sm text-gray-300">
            Mockup Image URL (default)
          </label>
          <input
            id="admin-mockup-url"
            type="url"
            value={activeConfig.mockupUrl}
            onChange={(event) => updateLocationConfig({ mockupUrl: event.target.value })}
            className="mb-4 w-full rounded border border-[#2b2b2b] bg-[#1f1f1f] px-3 py-2 text-white"
            placeholder="https://..."
          />

          <p className="mb-2 text-sm text-gray-300">Color Mockup URLs</p>
          <div className="mb-4 space-y-2">
            {COLOR_VARIANT_NAMES.map((color) => (
              <div key={color}>
                <label
                  htmlFor={`admin-color-mockup-${color.toLowerCase()}`}
                  className="mb-1 block text-xs text-gray-400"
                >
                  {color}
                </label>
                <input
                  id={`admin-color-mockup-${color.toLowerCase()}`}
                  type="url"
                  value={activeConfig.colorMockups?.[color] ?? ""}
                  onChange={(event) => {
                    const url = event.target.value.trim();
                    const next = { ...(activeConfig.colorMockups || {}) };
                    if (url) {
                      next[color] = url;
                    } else {
                      delete next[color];
                    }
                    updateLocationConfig({ colorMockups: Object.keys(next).length ? next : undefined });
                  }}
                  className="w-full rounded border border-[#2b2b2b] bg-[#1f1f1f] px-3 py-2 text-sm text-white"
                  placeholder="https://cdn.example.com/..."
                />
              </div>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="admin-max-width" className="mb-2 block text-sm text-gray-300">
                Max Print Width (in)
              </label>
              <input
                id="admin-max-width"
                type="number"
                min="0"
                step="0.1"
                value={activeConfig.maxPrintWidth}
                onChange={(event) => updateLocationConfig({ maxPrintWidth: Math.max(0, Number(event.target.value) || 0) })}
                className="w-full rounded border border-[#2b2b2b] bg-[#1f1f1f] px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="admin-max-height" className="mb-2 block text-sm text-gray-300">
                Max Print Height (in)
              </label>
              <input
                id="admin-max-height"
                type="number"
                min="0"
                step="0.1"
                value={activeConfig.maxPrintHeight}
                onChange={(event) => updateLocationConfig({ maxPrintHeight: Math.max(0, Number(event.target.value) || 0) })}
                className="w-full rounded border border-[#2b2b2b] bg-[#1f1f1f] px-3 py-2 text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedProduct || isSaving}
            className="w-full rounded bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500"
          >
            {isSaving ? "Saving..." : "Save Print Locations"}
          </button>

          {productsError ? <p className="mt-3 text-sm text-red-400">{productsError}</p> : null}
          {saveStatus ? <p className={`mt-3 text-sm ${saveStatus.includes("success") ? "text-green-400" : "text-red-400"}`}>{saveStatus}</p> : null}
        </section>

        <section className="flex-1 rounded-lg border border-[#232323] bg-[#151515] p-5">
          <div className="mb-4 flex items-center justify-between text-sm text-gray-300">
            <span>
              Product: <strong className="text-white">{selectedProduct?.title || "—"}</strong>
            </span>
            <span>
              Location: <strong className="text-white">{LOCATION_LABELS[selectedLocation]}</strong>
            </span>
          </div>

          <div className="flex justify-center">
            <div className="relative overflow-hidden rounded border border-[#333] bg-white" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={encodeURI(previewImageUrl)} alt="Mockup preview" className="absolute inset-0 h-full w-full object-contain" />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[#ececec] text-sm text-[#4b5563]">Set a mockup image URL to preview.</div>
              )}
              <Rnd
                bounds="parent"
                position={{ x: designRectPx.x, y: designRectPx.y }}
                size={{ width: designRectPx.width, height: designRectPx.height }}
                minWidth={20}
                minHeight={20}
                onDragStop={(_, data) => {
                  updateDesignAreaFromPx({
                    x: data.x,
                    y: data.y,
                    width: designRectPx.width,
                    height: designRectPx.height,
                  });
                }}
                onResizeStop={(_, __, ref, ___, position) => {
                  const width = ref.offsetWidth;
                  const height = ref.offsetHeight;
                  updateDesignAreaFromPx({
                    x: position.x,
                    y: position.y,
                    width,
                    height,
                  });
                }}
                className="z-20 border-2 border-dashed border-cyan-400"
                style={{ background: "rgba(34, 211, 238, 0.12)" }}
              />
            </div>
          </div>

          <div className="mt-4 rounded border border-[#2b2b2b] bg-[#111] p-3 text-sm text-gray-300">
            <p>
              designArea:{" "}
              <span className="text-white">
                {JSON.stringify(activeConfig.designArea)}
              </span>
            </p>
            <p className="mt-1">
              Max print:{" "}
              <span className="text-white">
                {activeConfig.maxPrintWidth} in × {activeConfig.maxPrintHeight} in
              </span>
            </p>
            {activeConfig.colorMockups && Object.keys(activeConfig.colorMockups).length > 0 ? (
              <p className="mt-1">
                Color mockups:{" "}
                <span className="text-white">
                  {Object.keys(activeConfig.colorMockups).join(", ")}
                </span>
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminMockupManagerPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0f0f10] p-8 text-white">
          <h1 className="text-2xl font-semibold">Loading...</h1>
        </main>
      }
    >
      <AdminMockupManagerContent />
    </Suspense>
  );
}
