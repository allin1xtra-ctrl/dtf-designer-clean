"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import CustomizerPrototype from "./CustomizerPrototype";

type AiAction = "remove-background" | "generate-idea";

type AiResponse = {
  ok?: boolean;
  imageDataUrl?: string;
  error?: string;
  suggestions?: string[];
  requestId?: string;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read artwork file."));
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, filename: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

function findMainArtworkInput() {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  return inputs.find((input) => input.closest("label")?.textContent?.includes("Upload Artwork")) || null;
}

function loadFileIntoCustomizer(file: File) {
  const input = findMainArtworkInput();
  if (!input) throw new Error("Customizer artwork input is not available.");

  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function ProductionAiTools({ artworkFile }: { artworkFile: File | null }) {
  const [prompt, setPrompt] = useState("");
  const [busyAction, setBusyAction] = useState<AiAction | null>(null);
  const [status, setStatus] = useState("AI tools are ready.");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const runAi = async (action: AiAction) => {
    if (busyAction) return;

    if (action === "remove-background" && !artworkFile) {
      setStatus("Upload a PNG, JPG, or WebP image before removing the background.");
      return;
    }

    const cleanPrompt = prompt.trim();
    if (action === "generate-idea" && !cleanPrompt) {
      setStatus("Describe your design style and key elements before generating an idea.");
      return;
    }

    setBusyAction(action);
    setSuggestions([]);
    setStatus(action === "remove-background" ? "Removing background..." : "Generating design idea...");

    try {
      let endpoint = "/api/ai/generate-idea";
      let body: Record<string, string> = { prompt: cleanPrompt };

      if (action === "remove-background") {
        if (!artworkFile) return;
        const supported = ["image/png", "image/jpeg", "image/webp"].includes(artworkFile.type);
        if (!supported) {
          throw new Error("Background removal supports PNG, JPG, and WebP artwork.");
        }
        endpoint = "/api/ai/remove-background";
        body = { imageDataUrl: await readFileAsDataUrl(artworkFile) };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as AiResponse;

      if (!response.ok || !result.ok || !result.imageDataUrl) {
        throw new Error(result.error || "AI tool could not complete the request.");
      }

      const file = await dataUrlToFile(
        result.imageDataUrl,
        action === "remove-background" ? `background-removed-${Date.now()}.png` : `ai-design-${Date.now()}.png`
      );
      loadFileIntoCustomizer(file);
      setSuggestions(Array.isArray(result.suggestions) ? result.suggestions : []);
      setStatus(action === "remove-background" ? "Background removed and added to the canvas." : "Design idea added to the canvas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "AI tool failed. Please try again.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div data-production-ai-ui="true" className="space-y-2">
      <button
        type="button"
        onClick={() => void runAi("remove-background")}
        disabled={Boolean(busyAction)}
        className="w-full rounded-md border border-cyan-400/60 bg-[#081114] px-3 py-2 text-left text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busyAction === "remove-background" ? "Removing Background..." : "Remove Background"}
      </button>

      <label className="block text-xs font-semibold text-neutral-300">
        Design idea prompt
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Describe your design style and key elements"
          rows={3}
          className="mt-1.5 w-full resize-y rounded-md border border-[#2c424a] bg-[#081114] px-2.5 py-2 text-xs font-normal text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-cyan-300"
        />
      </label>

      <button
        type="button"
        onClick={() => void runAi("generate-idea")}
        disabled={Boolean(busyAction)}
        className="w-full rounded-md border border-cyan-300 bg-cyan-300 px-3 py-2 text-left text-xs font-black text-neutral-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busyAction === "generate-idea" ? "Generating Idea..." : "Generate Idea"}
      </button>

      <p className="rounded-md border border-[#263d45] bg-[#071015] px-2.5 py-2 text-xs leading-5 text-neutral-300" aria-live="polite">
        {status}
      </p>

      {suggestions.length > 0 ? (
        <ul className="space-y-1 rounded-md border border-[#263d45] bg-[#071015] px-3 py-2 text-[11px] leading-4 text-neutral-400">
          {suggestions.slice(0, 3).map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function CustomizerProductionShell() {
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [aiPortalHost, setAiPortalHost] = useState<HTMLElement | null>(null);
  const scaleFrameRef = useRef<HTMLDivElement | null>(null);
  const scaleContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement | null;
      if (!input || input.type !== "file" || !input.files?.[0]) return;
      if (!input.closest("label")?.textContent?.includes("Upload Artwork")) return;
      setArtworkFile(input.files[0]);
    };

    document.addEventListener("change", onFileChange, true);
    return () => document.removeEventListener("change", onFileChange, true);
  }, []);

  useEffect(() => {
    let portalRoot: HTMLElement | null = null;

    const installAiPanel = () => {
      const heading = Array.from(document.querySelectorAll<HTMLHeadingElement>("h2")).find(
        (node) => node.textContent?.trim() === "AI Tools" || node.textContent?.trim() === "AI Design Tools"
      );
      const content = heading?.nextElementSibling as HTMLElement | null;
      if (!heading || !content) return false;

      heading.textContent = "AI Design Tools";
      Array.from(content.children).forEach((child) => {
        const element = child as HTMLElement;
        if (element.dataset.productionAiPortal === "true") return;
        element.style.display = "none";
      });

      portalRoot = content.querySelector<HTMLElement>('[data-production-ai-portal="true"]');
      if (!portalRoot) {
        portalRoot = document.createElement("div");
        portalRoot.dataset.productionAiPortal = "true";
        content.appendChild(portalRoot);
      }
      setAiPortalHost(portalRoot);
      return true;
    };

    if (installAiPanel()) return undefined;
    const observer = new MutationObserver(() => {
      if (installAiPanel()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (portalRoot?.isConnected) portalRoot.remove();
    };
  }, []);

  useEffect(() => {
    const updateScale = () => {
      const frame = scaleFrameRef.current;
      const content = scaleContentRef.current;
      if (!frame || !content) return;

      if (window.innerWidth > 768) {
        frame.style.height = "auto";
        content.style.setProperty("--dtf-mobile-scale", "1");
        return;
      }

      const availableWidth = Math.max(280, frame.clientWidth || window.innerWidth);
      const baseWidth = 1180;
      const baseHeight = 920;
      const scale = Math.min(1, availableWidth / baseWidth);
      content.style.setProperty("--dtf-mobile-scale", String(scale));
      frame.style.height = `${Math.ceil(baseHeight * scale)}px`;
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div ref={scaleFrameRef} className="dtf-production-scale-frame">
      <div ref={scaleContentRef} className="dtf-production-scale-content">
        <CustomizerPrototype />
      </div>
      {aiPortalHost ? createPortal(<ProductionAiTools artworkFile={artworkFile} />, aiPortalHost) : null}
      <style jsx global>{`
        @media (max-width: 768px) {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow-x: hidden !important;
            background: #061014 !important;
          }

          body > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .dtf-production-scale-frame {
            position: relative;
            width: 100%;
            overflow: hidden;
            background: #061014;
          }

          .dtf-production-scale-content {
            width: 1180px;
            height: 920px;
            transform: scale(var(--dtf-mobile-scale, 0.33));
            transform-origin: top left;
          }

          .dtf-production-scale-content .admin-doctor-customizer-root {
            position: static !important;
            width: 1180px !important;
            min-width: 1180px !important;
            max-width: 1180px !important;
            height: 920px !important;
            min-height: 920px !important;
            max-height: 920px !important;
            overflow: hidden !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }

          .dtf-production-scale-content .admin-doctor-customizer-root > header,
          .dtf-production-scale-content .admin-doctor-customizer-root > header > div {
            width: 1180px !important;
            min-width: 1180px !important;
            max-width: 1180px !important;
            height: 56px !important;
          }

          .dtf-production-scale-content .admin-doctor-customizer-shell {
            display: grid !important;
            grid-template-columns: 286px minmax(594px, 1fr) 300px !important;
            width: 1180px !important;
            min-width: 1180px !important;
            max-width: 1180px !important;
            height: 864px !important;
            min-height: 864px !important;
            max-height: 864px !important;
            overflow: hidden !important;
            margin: 0 !important;
          }

          .dtf-production-scale-content .admin-doctor-tools-panel,
          .dtf-production-scale-content .admin-doctor-settings-panel {
            display: block !important;
            height: 864px !important;
            min-height: 0 !important;
            max-height: 864px !important;
            overflow-x: hidden !important;
            overflow-y: auto !important;
            overscroll-behavior: contain;
            scrollbar-width: thin;
          }

          .dtf-production-scale-content .admin-doctor-canvas-panel {
            display: flex !important;
            height: 864px !important;
            min-height: 0 !important;
            max-height: 864px !important;
            overflow: hidden !important;
          }

          .dtf-production-scale-content .admin-doctor-settings-panel > div > div {
            display: block !important;
          }

          .dtf-production-scale-content .admin-doctor-mobile-tabs,
          .dtf-production-scale-content .admin-doctor-mobile-status {
            display: none !important;
          }
        }

        @media (min-width: 769px) {
          .dtf-production-scale-frame,
          .dtf-production-scale-content {
            width: 100%;
            min-height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}
