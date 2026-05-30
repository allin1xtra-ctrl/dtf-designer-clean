"use client";

import { useEffect } from "react";

const DEFAULT_APPAREL_HANDLE = "custom-t-shirt-upload-customize";

function textIncludes(element: Element | null, value: string) {
  return Boolean(
    element &&
      String(element.textContent || "")
        .toLowerCase()
        .includes(value.toLowerCase())
  );
}

function isCustomizerPath() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.toLowerCase().includes("/customizer");
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

function ensureBareCustomizerDefaultsToApparel() {
  if (!isCustomizerPath() || isGangSheetContext()) return false;

  const url = new URL(window.location.href);
  const hasProduct = Boolean(url.searchParams.get("product") || url.searchParams.get("handle"));
  const mode = String(url.searchParams.get("mode") || "").toLowerCase();
  const alreadyDefaulted = url.searchParams.get("dtfDefaultApparel") === "1";

  if (hasProduct || mode === "transfer" || alreadyDefaulted) return false;

  url.searchParams.set("product", DEFAULT_APPAREL_HANDLE);
  url.searchParams.set("mode", "apparel");
  url.searchParams.set("dtfDefaultApparel", "1");
  window.location.replace(url.toString());
  return true;
}

function hideElement(element: Element | null) {
  if (element instanceof HTMLElement) {
    element.hidden = true;
    element.style.display = "none";
  }
}

function showElement(element: Element | null) {
  if (element instanceof HTMLElement) {
    element.hidden = false;
    element.style.display = "";
  }
}

function closestPanel(element: Element | null) {
  if (!element) return null;
  return element.closest('[class*="rounded"][class*="border"]') || element.closest("section") || element.closest("div");
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

function findTransferSizePreviewPanel(aside: Element) {
  const candidates = aside.querySelectorAll("section, div");

  for (const candidate of candidates) {
    const text = String(candidate.textContent || "").toLowerCase();
    if (text.includes("transfer size preview")) {
      return closestPanel(candidate);
    }
  }

  return null;
}

function findOrderPanel(aside: Element) {
  const buttons = aside.querySelectorAll("button");

  for (const button of buttons) {
    if (textIncludes(button, "Add Custom Design to Cart")) {
      return closestPanel(button) || button.parentElement;
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

  return uploadElement.closest('[class*="mt-"]') || uploadElement.closest("div");
}

function findAddToCartButton(panel: Element) {
  return Array.from(panel.querySelectorAll("button")).find((button) =>
    textIncludes(button, "Add Custom Design to Cart")
  );
}

function renameGangSheetOrderPanel(panel: Element) {
  const labels = panel.querySelectorAll("p, h2, h3, span");

  for (const label of labels) {
    const text = String(label.textContent || "").trim().toLowerCase();

    if (text === "checkout panel" || text === "checkout") {
      label.textContent = "Print Setup";
    }
  }
}

function cleanApparelOrderPanel(panel: Element) {
  const labels = Array.from(panel.querySelectorAll("p, h2, h3, span, label"));

  for (const label of labels) {
    const text = String(label.textContent || "").trim().toLowerCase();

    if (text === "checkout panel" || text === "checkout") {
      hideElement(label);
    }

    if (text === "size") {
      hideElement(label);
      const next = label.nextElementSibling;
      hideElement(next);
    }
  }

  const sizeControls = panel.querySelectorAll('#checkout-size-input, [name="size"]');
  sizeControls.forEach((control) => hideElement(control));

  const addToCartButton = findAddToCartButton(panel);
  if (addToCartButton instanceof HTMLElement) {
    addToCartButton.style.marginTop = "6px";
  }
}

function movePanelAfterUpload(aside: Element, panel: Element) {
  const uploadArtworkPanel = findUploadArtworkPanel(aside);
  if (!uploadArtworkPanel || uploadArtworkPanel.nextElementSibling === panel) return;

  uploadArtworkPanel.insertAdjacentElement("afterend", panel);
  if (panel instanceof HTMLElement) {
    panel.style.marginTop = "12px";
  }
}

function moveGangSheetPanelToTop(aside: Element, panel: Element) {
  const intro = aside.querySelector("h1")?.closest("div");
  const anchor = intro && intro.parentElement === aside ? intro.nextSibling : aside.firstChild;

  if (panel.previousSibling !== intro) {
    aside.insertBefore(panel, anchor);
  }
}

function moveUploadArtworkIntoGangSheetPanel(aside: Element, panel: Element) {
  const uploadArtworkPanel = findUploadArtworkPanel(aside);
  const addToCartButton = findAddToCartButton(panel);

  if (!uploadArtworkPanel || !addToCartButton || panel.contains(uploadArtworkPanel)) return;

  uploadArtworkPanel.classList.remove("mt-5", "md:mt-5");
  uploadArtworkPanel.classList.add("mt-3");

  panel.insertBefore(uploadArtworkPanel, addToCartButton);
}

function hideAutosavePanels(aside: Element) {
  const candidates = aside.querySelectorAll("div, p, button");

  for (const candidate of candidates) {
    const text = String(candidate.textContent || "").trim().toLowerCase();

    if (!text) continue;

    const isAutosaveStatus =
      text === "design autosaved" ||
      text === "saved design cleared" ||
      text === "previous design restored" ||
      text === "your design is saved automatically while you work.";

    const isClearSavedDesign = text.includes("clear saved design");

    if (isAutosaveStatus || isClearSavedDesign) {
      hideElement(closestPanel(candidate) || candidate);
    }
  }
}

function patchCustomizerSidebar() {
  if (!isCustomizerPath()) return false;

  const aside = document.querySelector(".customizer-mobile-shell aside, aside");
  if (!aside) return false;

  const orderPanel = findOrderPanel(aside);
  hideAutosavePanels(aside);

  if (isGangSheetContext()) {
    hideElement(findCurrentViewPanel(aside));

    if (!orderPanel) return false;
    renameGangSheetOrderPanel(orderPanel);
    moveGangSheetPanelToTop(aside, orderPanel);
    moveUploadArtworkIntoGangSheetPanel(aside, orderPanel);
    orderPanel.setAttribute("data-dtf-print-setup-panel", "true");
    showElement(orderPanel);
    return true;
  }

  hideElement(findTransferSizePreviewPanel(aside));

  if (!orderPanel) return false;
  cleanApparelOrderPanel(orderPanel);
  movePanelAfterUpload(aside, orderPanel);
  orderPanel.setAttribute("data-dtf-apparel-order-panel", "true");
  showElement(orderPanel);
  return true;
}

export default function GangSheetCustomizerUiPatch() {
  useEffect(() => {
    if (ensureBareCustomizerDefaultsToApparel()) return;

    let attempts = 0;
    const maxAttempts = 50;

    const timer = window.setInterval(() => {
      attempts += 1;
      const patched = patchCustomizerSidebar();

      if (patched || attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 250);

    const observer = new MutationObserver(() => {
      patchCustomizerSidebar();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const observerTimeout = window.setTimeout(() => {
      observer.disconnect();
    }, 12000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(observerTimeout);
      observer.disconnect();
    };
  }, []);

  return null;
}
