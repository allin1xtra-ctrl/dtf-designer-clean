"use client";

import { useEffect } from "react";

function textIncludes(element: Element | null, value: string) {
  return Boolean(
    element &&
      String(element.textContent || "")
        .toLowerCase()
        .includes(value.toLowerCase())
  );
}

function isGangSheetContext() {
  if (typeof window === "undefined") return false;

  const source = [window.location.href, window.location.search, document.referrer]
    .join(" ")
    .toLowerCase();

  return (
    source.includes("gang-sheet") ||
    source.includes("gangsheet") ||
    source.includes("gang sheet") ||
    source.includes("dtf-gang")
  );
}

function hideElement(element: Element | null) {
  if (element instanceof HTMLElement) {
    element.hidden = true;
    element.style.display = "none";
  }
}

function findCurrentViewPanel(aside: Element) {
  const candidates = aside.querySelectorAll("section, div");

  for (const candidate of candidates) {
    const text = String(candidate.textContent || "").toLowerCase();

    if (
      text.includes("current view") &&
      (text.includes("front") || text.includes("back") || text.includes("left sleeve"))
    ) {
      return candidate.closest("section") || candidate;
    }
  }

  return null;
}

function findPrintSetupPanel(aside: Element) {
  const buttons = aside.querySelectorAll("button");

  for (const button of buttons) {
    if (textIncludes(button, "Add Custom Design to Cart")) {
      return button.closest('[class*="rounded"][class*="border"]') || button.parentElement;
    }
  }

  return null;
}

function findUploadArtworkPanel(aside: Element) {
  const uploadInput = aside.querySelector('#artwork-upload-input, input[name="artworkUpload"]');
  const uploadButton = Array.from(aside.querySelectorAll("button")).find((button) =>
    textIncludes(button, "Upload Artwork")
  );

  const uploadElement = uploadInput || uploadButton;
  if (!uploadElement) return null;

  const panel = uploadElement.closest('[class*="mt-"]') || uploadElement.closest("div");
  return panel || null;
}

function findAddToCartButton(panel: Element) {
  return Array.from(panel.querySelectorAll("button")).find((button) =>
    textIncludes(button, "Add Custom Design to Cart")
  );
}

function renamePrintSetupPanel(panel: Element) {
  const labels = panel.querySelectorAll("p, h2, h3, span");

  for (const label of labels) {
    const text = String(label.textContent || "").trim().toLowerCase();

    if (text === "checkout panel" || text === "checkout") {
      label.textContent = "Print Setup";
    }
  }
}

function movePrintSetupPanelToTop(aside: Element, panel: Element) {
  const intro = aside.querySelector("h1")?.closest("div");
  const anchor = intro && intro.parentElement === aside ? intro.nextSibling : aside.firstChild;

  if (panel.previousSibling !== intro) {
    aside.insertBefore(panel, anchor);
  }
}

function moveUploadArtworkIntoPrintSetup(aside: Element, printSetupPanel: Element) {
  const uploadArtworkPanel = findUploadArtworkPanel(aside);
  const addToCartButton = findAddToCartButton(printSetupPanel);

  if (!uploadArtworkPanel || !addToCartButton || printSetupPanel.contains(uploadArtworkPanel)) return;

  uploadArtworkPanel.classList.remove("mt-5", "md:mt-5");
  uploadArtworkPanel.classList.add("mt-3");

  printSetupPanel.insertBefore(uploadArtworkPanel, addToCartButton);
}

function hideAutosavePanels(aside: Element) {
  const candidates = aside.querySelectorAll("div, p, button");

  for (const candidate of candidates) {
    const text = String(candidate.textContent || "").trim().toLowerCase();

    if (!text) continue;

    const isAutosaveStatus =
      text === "design autosaved" ||
      text === "saved design cleared" ||
      text === "your design is saved automatically while you work.";

    const isClearSavedDesign = text.includes("clear saved design");

    if (isAutosaveStatus || isClearSavedDesign) {
      const panel = candidate.closest('[class*="rounded"][class*="border"]') || candidate;
      hideElement(panel);
    }
  }
}

function patchGangSheetCustomizer() {
  if (!isGangSheetContext()) return false;

  const aside = document.querySelector(".customizer-mobile-shell aside, aside");
  if (!aside) return false;

  const printSetupPanel = findPrintSetupPanel(aside);
  if (!printSetupPanel) return false;

  renamePrintSetupPanel(printSetupPanel);
  movePrintSetupPanelToTop(aside, printSetupPanel);
  moveUploadArtworkIntoPrintSetup(aside, printSetupPanel);
  hideAutosavePanels(aside);

  hideElement(findCurrentViewPanel(aside));

  printSetupPanel.setAttribute("data-dtf-print-setup-panel", "true");
  return true;
}

export default function GangSheetCustomizerUiPatch() {
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 40;

    const timer = window.setInterval(() => {
      attempts += 1;
      const patched = patchGangSheetCustomizer();

      if (patched || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 250);

    const observer = new MutationObserver(() => {
      patchGangSheetCustomizer();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const observerTimeout = window.setTimeout(() => {
      observer.disconnect();
    }, 10000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(observerTimeout);
      observer.disconnect();
    };
  }, []);

  return null;
}
