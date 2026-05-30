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

function renamePrintSetupPanel(panel: Element) {
  const labels = panel.querySelectorAll("p, h2, h3, span");

  for (const label of labels) {
    const text = String(label.textContent || "").trim().toLowerCase();

    if (text === "checkout panel") {
      label.textContent = "Print Setup";
    }

    if (text === "checkout") {
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

function patchGangSheetCustomizer() {
  if (!isGangSheetContext()) return false;

  const aside = document.querySelector(".customizer-mobile-shell aside, aside");
  if (!aside) return false;

  const printSetupPanel = findPrintSetupPanel(aside);
  if (!printSetupPanel) return false;

  renamePrintSetupPanel(printSetupPanel);
  movePrintSetupPanelToTop(aside, printSetupPanel);

  const currentViewPanel = findCurrentViewPanel(aside);
  if (currentViewPanel instanceof HTMLElement) {
    currentViewPanel.hidden = true;
    currentViewPanel.style.display = "none";
  }

  printSetupPanel.setAttribute("data-dtf-print-setup-panel", "true");
  return true;
}

export default function GangSheetCustomizerUiPatch() {
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 30;

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
    }, 8000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(observerTimeout);
      observer.disconnect();
    };
  }, []);

  return null;
}
