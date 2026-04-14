document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("dtf-designer");

  if (!container) return;

  const productId = container.dataset.productId;
  const variantId = container.dataset.variantId;

  const iframe = document.createElement("iframe");

  iframe.src = `https://dtf-designer-clean.vercel.app?product=${productId}&variant=${variantId}`;
  iframe.style.width = "100%";
  iframe.style.height = "700px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";

  container.innerHTML = "";
  container.appendChild(iframe);
});