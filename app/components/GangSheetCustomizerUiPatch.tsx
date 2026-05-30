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

function isCustomizerContext() {
  if (typeof window === "undefined") return false;

  const source = [window.location.href, window.location.search, document.referrer]
    .join(" ")
    .toLowerCase();

  return source.includes("/customizer") || source.includes("dtf-designer");
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

  return uploadElement.closest('[class*="mt-"]') || uploadElement.closest("div");
}

function findAddToCartButton(panel: Element) {
  return Array.from(panel.querySelectorAll("button")).find((button) =>
    textIncludes(button, "Add Custom Design to Cart")
  );
}

function findPanelByText(aside: Element, textValue: string) {
  const candidates = aside.querySelectorAll("section, div");

  for (const candidate of candidates) {
    const text = String(candidate.textContent || "").toLowerCase();
    if (text.includes(textValue.toLowerCase())) {
      return candidate.closest('[class*="rounded"][class*="border"]') || candidate;
    }
  }

  return null;
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

function hideCheckoutLabelsAndCustomSize(panel: Element) {
  const labels = Array.from(panel.querySelectorAll("p, h2, h3, span, label"));

  for (const label of labels) {
    const text = String(label.textContent || "").trim().toLowerCase();

    if (text === "checkout panel" || text === "checkout") {
      hideElement(label);
    }

    if (text === "size") {
      hideElement(label);
      const nextElement = label.nextElementSibling;
      if (
        nextElement instanceof HTMLSelectElement ||
        nextElement instanceof HTMLInputElement ||
        nextElement?.tagName.toLowerCase() === "select" ||
        nextElement?.tagName.toLowerCase() === "input"
      ) {
        hideElement(nextElement);
      }
    }
  }

  const sizeControls = panel.querySelectorAll('#checkout-size-input, [name="size"]');
  sizeControls.forEach((control) => hideElement(control));
}

function movePrintSetupPanelToTop(aside: Element, panel: Element) {
  const intro = aside.querySelector("h1")?.closest("div");
  const anchor = intro && intro.parentElement === aside ? intro.nextSibling : aside.firstChild;

  if (panel.previousSibling !== intro) {
    aside.insertBefore(panel, anchor);
  }
}

function movePanelAfterUpload(aside: Element, panel: Element) {
  const uploadArtworkPanel = findUploadArtworkPanel(aside);
  if (!uploadArtworkPanel) return;

  uploadArtworkPanel.insertAdjacentElement("afterend", panel);
  if (panel instanceof HTMLElement) {
    panel.style.marginTop = "12px";
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

function hideTransferSizePreview(aside: Element) {
  hideElement(findPanelByText(aside, "Transfer Size Preview"));
}

function patchRulerPlacement() {
  const rulerCandidates = document.querySelectorAll<HTMLElement>(
    '.pointer-events-none.absolute.z-30[class*="text-cyan-100"]'
  );

  rulerCandidates.forEach((ruler) => {
    const width = parseFloat(ruler.style.width || "0");
    const height = parseFloat(ruler.style.height || "0");

    const isHorizontalRuler = height > 0 && height <= 22 && width > 40;
    const isVerticalRuler = width > 0 && width <= 24 && height > 40;

    if (isHorizontalRuler) {
      const currentTop = parseFloat(ruler.style.top || "0");
      const baseTop = Number(ruler.dataset.dtfBaseTop || currentTop);
      ruler.dataset.dtfBaseTop = String(baseTop);
      ruler.style.top = `${baseTop + 20}px`;
    }

    if (isVerticalRuler) {
      const currentLeft = parseFloat(ruler.style.left || "0");
      const baseLeft = Number(ruler.dataset.dtfBaseLeft || currentLeft);
      ruler.dataset.dtfBaseLeft = String(baseLeft);
      ruler.style.left = `${baseLeft + 22}px`;
    }
  });
}

function patchCustomizerUi() {
  if (!isCustomizerContext()) return false;

  const aside = document.querySelector(".customizer-mobile-shell aside, aside");
  if (!aside) {
    patchRulerPlacement();
    return false;
  }

  const printSetupPanel = findPrintSetupPanel(aside);

  hideAutosavePanels(aside);
  hideTransferSizePreview(aside);
  patchRulerPlacement();

  if (isGangSheetContext()) {
    hideElement(findCurrentViewPanel(aside));
  }

  if (!printSetupPanel) return false;

  if (isGangSheetContext()) {
    renamePrintSetupPanel(printSetupPanel);
    movePrintSetupPanelToTop(aside, printSetupPanel);
    moveUploadArtworkIntoPrintSetup(aside, printSetupPanel);
  } else {
    hideCheckoutLabelsAndCustomSize(printSetupPanel);
    movePanelAfterUpload(aside, printSetupPanel);
  }

  printSetupPanel.setAttribute("data-dtf-print-setup-panel", "true");
  return true;
}

export default function GangSheetCustomizerUiPatch() {
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 60;

    const timer = window.setInterval(() => {
      attempts += 1;
      const patched = patchCustomizerUi();

      if (patched && attempts >= 4) {
        window.clearInterval(timer);
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
      }
    }, 250);

    const observer = new MutationObserver(() => {
      patchCustomizerUi();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    }

    const observerTimeout = window.setTimeout(() => {
      observer.disconnect();
    }, 15000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(observerTimeout);
      observer.disconnect();
    };
  }, []);

  return null;
}
