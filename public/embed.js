(function () {
  function normalizeImageUrl(url) {
    if (!url) return "";
    if (url.startsWith("//")) return `${window.location.protocol}${url}`;
    return url;
  }

  function normalizeDesignerUrl(url) {
    if (!url) return "";
    return String(url).replace(/\/$/, "");
  }

  function normalizeVariantId(value) {
    if (value == null) return "";
    const normalized = String(value).trim();
    if (!normalized || normalized === "undefined" || normalized === "null" || normalized === "NaN") return "";

    const gidMatch = normalized.match(/(?:^|\/)(\d+)(?:\D*)$/);
    if (gidMatch) return gidMatch[1];

    return /^\d+$/.test(normalized) ? normalized : "";
  }

  function getMountContainers(target) {
    if (target instanceof Element) {
      return [target];
    }

    if (typeof target === "string" && target) {
      const byId = document.getElementById(target);
      if (byId) return [byId];

      const bySelector = document.querySelector(target);
      if (bySelector) return [bySelector];
    }

    return Array.from(document.querySelectorAll('.dtf-designer-mount, [id="dtf-designer"], [id^="dtf-designer-"]'));
  }

  function getProductForm(container) {
    return container.closest('form[action*="/cart/add"]') || document.querySelector('form[action*="/cart/add"]');
  }

  function getCurrentVariantId(container) {
    const productForm = getProductForm(container);

    return normalizeVariantId(
      productForm?.querySelector('input[name="id"]:checked')?.value ||
        productForm?.querySelector('input[name="id"]')?.value ||
        productForm?.querySelector('select[name="id"]')?.value ||
        document.querySelector('form[action*="/cart/add"] [name="id"]')?.value ||
        document.querySelector('select[name="id"]')?.value ||
        document.querySelector('input[name="id"]:checked')?.value ||
        document.querySelector('input[name="id"]')?.value ||
        new URLSearchParams(window.location.search).get("variant") ||
        container.dataset.variantId ||
        ""
    );
  }

  function getCurrentProductImage(container) {
    return normalizeImageUrl(
      container.dataset.productImage ||
      document.querySelector('[data-product-media-wrapper]:not([hidden]) img')?.currentSrc ||
      document.querySelector('.product__media img[loading="eager"]')?.currentSrc ||
      document.querySelector('.product__media img')?.currentSrc ||
      document.querySelector('[data-media-id] img')?.currentSrc ||
      document.querySelector('img.product-featured-media')?.currentSrc ||
      ""
    );
  }

  function getProductTitle(container) {
    return (
      container.dataset.productTitle ||
      document.querySelector('h1')?.textContent?.trim() ||
      document.title.replace(/\s*[|:-].*$/, "") ||
      "Custom product"
    );
  }

  function getLaunchMode(container) {
    const params = new URLSearchParams(window.location.search);
    const requested = (container.dataset.defaultMode || params.get("dtf_mode") || params.get("mode") || "").toLowerCase();
    return requested === "transfer" ? "transfer" : "apparel";
  }

  function shouldStartUpload(container) {
    const params = new URLSearchParams(window.location.search);
    return container.dataset.startUpload === "1" || container.dataset.startUpload === "true" || params.get("upload") === "1";
  }

  function openCartUi(redirectToCart) {
    document.documentElement.dispatchEvent(new CustomEvent("cart:refresh"));
    document.documentElement.dispatchEvent(new CustomEvent("cart:open"));
    document.dispatchEvent(new CustomEvent("cart:refresh"));
    document.dispatchEvent(new CustomEvent("cart:open"));

    if (redirectToCart) {
      window.location.href = "/cart";
    }
  }

  async function parseCartResponse(response) {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text };
    }
  }

  async function addItemViaAjax(item) {
    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ items: [item] }),
    });

    const data = await parseCartResponse(response);

    if (!response.ok) {
      throw new Error(data?.description || data?.message || "Shopify cart request failed.");
    }

    return data;
  }

  async function addItemViaForm(item) {
    const formData = new FormData();
    formData.append("id", String(item.id));
    formData.append("quantity", String(item.quantity || 1));

    Object.entries(item.properties || {}).forEach(([key, value]) => {
      if (value == null) return;
      formData.append(`properties[${key}]`, String(value));
    });

    const response = await fetch("/cart/add.js", {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await parseCartResponse(response);

    if (!response.ok) {
      throw new Error(data?.description || data?.message || "Shopify cart form request failed.");
    }

    return data;
  }

  function initDtfDesigner(target) {
    const containers = getMountContainers(target);
    if (!containers.length) return;

    containers.forEach((container) => {
      if (typeof container.__dtfDesignerCleanup === "function") {
        container.__dtfDesignerCleanup();
      }

      const productId = container.dataset.productId || "";
      const designerUrl = normalizeDesignerUrl(container.dataset.designerUrl || "https://dtf-designer-clean.vercel.app");
      const appVersion = container.dataset.appVersion || "2026-04-15-3";
      const redirectToCart = container.dataset.redirectToCart !== "false";
      const productTitle = getProductTitle(container);
      const launchMode = getLaunchMode(container);
      const startUpload = shouldStartUpload(container);
      let variantId = getCurrentVariantId(container);
      let productImage = getCurrentProductImage(container);
      const productForm = getProductForm(container);

      const iframe = document.createElement("iframe");
      const url = new URL(designerUrl, window.location.origin);
      const designerOrigin = url.origin;

    if (productId) url.searchParams.set("product", productId);
    if (variantId) url.searchParams.set("variant", variantId);
    if (productImage) url.searchParams.set("image", productImage);
    if (productTitle) url.searchParams.set("title", productTitle);
    if (launchMode) url.searchParams.set("mode", launchMode);
    if (startUpload) url.searchParams.set("upload", "1");
    url.searchParams.set("source", "shopify-theme");
    url.searchParams.set("v", appVersion);

    iframe.src = url.toString();
    iframe.style.width = "100%";
    iframe.style.height = "900px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "12px";
    iframe.loading = "lazy";
    iframe.dataset.dtfDesigner = "true";

      const postShopifyContext = () => {
        iframe.contentWindow?.postMessage(
          {
            type: "dtf:shopify-context",
            payload: {
              productId,
              variantId,
              productImage,
              productTitle,
            },
          },
          designerOrigin
        );
      };

      const syncShopifyContext = () => {
        const nextVariantId = getCurrentVariantId(container);
        const nextProductImage = getCurrentProductImage(container);
        const variantChanged = Boolean(nextVariantId && nextVariantId !== variantId);
        const imageChanged = Boolean(nextProductImage && nextProductImage !== productImage);

        if (!variantChanged && !imageChanged) return;

        if (variantChanged) {
          variantId = nextVariantId;
          container.dataset.variantId = nextVariantId;
        }

        if (imageChanged) {
          productImage = nextProductImage;
          container.dataset.productImage = nextProductImage;
        }

        postShopifyContext();
      };

      const onVariantChange = (event) => {
        const nextId = normalizeVariantId(event?.detail?.variant?.id || event?.detail?.id);
        if (nextId) {
          variantId = nextId;
          container.dataset.variantId = variantId;
        }
        syncShopifyContext();
      };

      const onMessage = async function (event) {
        if (event.source !== iframe.contentWindow) return;
        if (event.origin !== designerOrigin) return;

        const message = event.data || {};

        if (message.type === "dtf:resize" && message.payload?.height) {
          iframe.style.height = `${Math.max(700, Number(message.payload.height))}px`;
          return;
        }

        if (message.type !== "dtf:add-to-cart") return;

        try {
          syncShopifyContext();

          const payload = message.payload || {};
          const cartVariantId = normalizeVariantId(payload.variantId || getCurrentVariantId(container) || variantId);

          if (!cartVariantId) {
            throw new Error("No Shopify variant is currently selected.");
          }

          const cartVariantNumber = Number(cartVariantId);

          if (!Number.isFinite(cartVariantNumber) || cartVariantNumber <= 0) {
            throw new Error("No valid Shopify variant is currently selected.");
          }

          const item = {
            id: cartVariantNumber,
            quantity: Math.max(1, Number(payload.quantity) || 1),
            properties: payload.properties || {},
          };

          let cart;

          try {
            cart = await addItemViaAjax(item);
          } catch (ajaxError) {
            cart = await addItemViaForm(item);
            console.warn("DTF cart bridge fell back to form submission:", ajaxError);
          }

          iframe.contentWindow?.postMessage({ type: "dtf:cart-success", payload: cart }, designerOrigin);
          document.dispatchEvent(new CustomEvent("dtf:cart-updated", { detail: cart }));
          openCartUi(redirectToCart);
        } catch (error) {
          const messageText = error instanceof Error ? error.message : "Unable to add item to cart.";
          iframe.contentWindow?.postMessage(
            { type: "dtf:cart-error", payload: { message: messageText } },
            designerOrigin
          );
          console.error("DTF add-to-cart error:", error);
        }
      };

      const formListener = () => syncShopifyContext();
      const observer = typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            syncShopifyContext();
          })
        : null;

      iframe.addEventListener("load", postShopifyContext);
      window.addEventListener("message", onMessage);
      window.addEventListener("change", syncShopifyContext);
      document.addEventListener("variant:change", onVariantChange);
      document.addEventListener("product:variant-change", onVariantChange);

      if (productForm) {
        productForm.addEventListener("change", formListener);
        productForm.addEventListener("input", formListener);
        observer?.observe(productForm, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["value", "checked", "selected", "src"],
        });
      }

      container.innerHTML = "";
      container.appendChild(iframe);
      syncShopifyContext();

      container.__dtfDesignerCleanup = function () {
        window.removeEventListener("message", onMessage);
        window.removeEventListener("change", syncShopifyContext);
        document.removeEventListener("variant:change", onVariantChange);
        document.removeEventListener("product:variant-change", onVariantChange);
        iframe.removeEventListener("load", postShopifyContext);
        if (productForm) {
          productForm.removeEventListener("change", formListener);
          productForm.removeEventListener("input", formListener);
        }
        observer?.disconnect();
      };
    });
  }

  window.initDtfDesigner = initDtfDesigner;
  document.addEventListener("shopify:section:load", initDtfDesigner);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDtfDesigner);
  } else {
    initDtfDesigner();
  }
})();