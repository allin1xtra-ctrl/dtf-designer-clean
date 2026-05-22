diff --git a/app/customizer/page.tsx b/app/customizer/page.tsx
index e0316ff4b51ab648f1e839e9966193e24d2ce62f..f11dd8e923b1f46bc1bf011640e855a9dcb76524 100644
--- a/app/customizer/page.tsx
+++ b/app/customizer/page.tsx
@@ -911,58 +911,66 @@ export default function CustomizerPage() {
         const serialized = JSON.stringify(payload);
         if (serialized === lastSavedDraftRef.current) return;
 
         window.localStorage.setItem(draftStorageKey, serialized);
         lastSavedDraftRef.current = serialized;
         setDraftStatus("Design autosaved");
       } catch (error) {
         console.error("Failed to autosave design draft:", error);
       }
     }, DRAFT_AUTOSAVE_DEBOUNCE_MS);
   };
 
   // Intentionally keyed to readiness + product + variant. Other referenced functions are stable enough here,
   // and re-running on every render would cause unnecessary draft restore attempts.
   useEffect(() => {
     if (typeof window === "undefined") return;
 
     const MIN_HEIGHT_CHANGE_THRESHOLD = 80;
     const HEIGHT_UPDATE_DEBOUNCE_MS = 250;
     let timer: ReturnType<typeof setTimeout> | null = null;
 
     const sendHeight = () => {
       if (timer) clearTimeout(timer);
 
       timer = setTimeout(() => {
-        const nextHeight = Math.ceil(
+        const contentHeight = Math.ceil(
           Math.max(
             document.documentElement.scrollHeight,
             document.body.scrollHeight,
             document.documentElement.offsetHeight,
             document.body.offsetHeight
           )
         );
+        const viewportHeight = Math.ceil(
+          window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0
+        );
+        const params = new URLSearchParams(window.location.search);
+        const hasShopifySource = params.get("source") === "shopify";
+        const nextHeight = hasShopifySource
+          ? Math.max(320, viewportHeight)
+          : Math.max(contentHeight, viewportHeight);
 
         const previousHeight = lastSentIframeHeightRef.current;
         const heightDifference = Math.abs(nextHeight - previousHeight);
 
         if (previousHeight && heightDifference < MIN_HEIGHT_CHANGE_THRESHOLD) {
           return;
         }
 
         lastSentIframeHeightRef.current = nextHeight;
 
         window.parent?.postMessage(
           {
             type: "DTF_IFRAME_HEIGHT",
             height: nextHeight,
           },
           "*"
         );
       }, HEIGHT_UPDATE_DEBOUNCE_MS);
     };
 
     sendHeight();
 
     const timeouts = [300, 800, 1500, 2500].map((delay) =>
       window.setTimeout(sendHeight, delay)
     );
@@ -2402,90 +2410,119 @@ export default function CustomizerPage() {
         properties: lineItemProperties,
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
-    <div className="h-dvh overflow-hidden bg-[#0e0e0e] text-white">
+    <div className="h-dvh max-h-dvh overflow-hidden bg-[#0e0e0e] text-white">
       <style jsx global>{`
         .canvas-container,
         .upper-canvas,
         .lower-canvas {
           position: absolute !important;
           left: 0 !important;
           top: 0 !important;
           max-width: 100% !important;
           max-height: 100% !important;
         }
 
         .canvas-container {
           z-index: 10 !important;
         }
 
+        .customizer-mobile-shell-wrap {
+          width: 100%;
+          height: 100%;
+          overflow: hidden;
+        }
+
+        .customizer-mobile-shell {
+          display: grid;
+          grid-template-columns: 360px minmax(0, 1fr);
+          width: 100%;
+          min-width: 0;
+          height: 100%;
+          transform: none;
+          overflow: hidden;
+        }
+
         @media (max-width: 768px) {
           html,
           body {
             overflow-x: hidden;
           }
 
+          .customizer-mobile-shell-wrap {
+            display: flex;
+            height: 100%;
+            width: 100%;
+            align-items: center;
+            justify-content: center;
+            overflow: hidden;
+          }
+
+          .customizer-mobile-shell {
+            grid-template-columns: 320px minmax(0, 1fr);
+            width: 920px;
+            min-width: 920px;
+            height: 100dvh;
+            max-height: 100dvh;
+            overflow: hidden;
+            transform: scale(min(1, calc(100vw / 920)));
+            transform-origin: top left;
+          }
+
           .canvas-container,
           .upper-canvas,
           .lower-canvas {
             transform-origin: top left !important;
           }
         }
       `}</style>
-      <div className="border-b border-[#222] bg-[#111] px-4 py-4 md:hidden">
-        <h1 className="text-xl font-bold">DTF Designer Pro</h1>
-        <p className="mt-1 text-sm text-gray-400">
-          Upload artwork, customize DTF transfers and gang sheets, place designs on custom
-          t-shirts and hoodies, then send your order details to Shopify checkout.
-        </p>
-      </div>
-
-      <div className="flex h-full min-w-0 flex-col overflow-hidden md:grid md:grid-cols-[360px_minmax(0,1fr)]">
-        <aside className="order-2 w-full shrink-0 overflow-y-auto border-t border-[#222] bg-[#111] p-4 pb-12 md:order-1 md:h-dvh md:w-auto md:border-t-0 md:border-r md:p-5">
-          <div className="hidden md:block">
+      <div className="customizer-mobile-shell-wrap">
+        <div className="customizer-mobile-shell flex h-full min-w-0 overflow-hidden md:grid md:grid-cols-[360px_minmax(0,1fr)]">
+          <aside className="order-1 h-full w-[320px] shrink-0 overflow-y-auto border-r border-[#222] bg-[#111] p-4 pb-12 md:w-auto md:p-5">
+          <div>
             <h1 className="text-xl font-bold">DTF Designer Pro</h1>
             <p className="mt-1 text-sm text-gray-400">
               Upload artwork, customize DTF transfers and gang sheets, place designs on custom
               t-shirts and hoodies, then send your order details to Shopify checkout.
             </p>
           </div>
 
           {shouldShowPlacementControls ? (
             <div className="mt-2 md:mt-5">
               <PrintLocationControls
                 availableViews={availableViews}
                 currentView={currentView}
                 isReady={isReady}
                 loadView={loadView}
                 printLocationsError={printLocationsError}
               />
             </div>
           ) : (
             <div className="mt-2 rounded border border-[#2b2b2b] bg-[#171717] px-3 py-2 text-xs text-gray-300 md:mt-5">
               DTF Transfer / Gang Sheet mode
             </div>
           )}
 
           {draftStatus ? (
             <div
@@ -2693,81 +2730,82 @@ export default function CustomizerPage() {
           <label htmlFor="checkout-size-input" className="mb-2 block text-sm text-gray-300">Size</label>
           {hasSizeOptions ? (
             <select
               id="checkout-size-input"
               name="size"
               value={selectedSize}
               onChange={(e) => handleSizeChange(e.target.value)}
               className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white"
             >
               {availableSizes.map((size) => (
                 <option key={size} value={size}>
                   {size}
                 </option>
               ))}
             </select>
           ) : (
             <input id="checkout-size-input" name="size" type="text" value={selectedSize} onChange={(e) => handleSizeChange(e.target.value)} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />
           )}
 
           <label htmlFor="checkout-quantity-input" className="mb-2 block text-sm text-gray-300">Quantity</label>
           <input id="checkout-quantity-input" name="quantity" type="number" min="1" value={quantity} onChange={(e) => handleQuantityChange(Number(e.target.value))} className="mb-3 w-full rounded bg-[#1f1f1f] px-3 py-2 text-white" />
 
           <button type="button" onClick={handleAddToCart} disabled={isAddToCartDisabled} aria-describedby={addToCartDescriptionId} className="w-full rounded bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-500">{isSubmitting ? "Uploading..." : "Add Custom Design to Cart"}</button>
           {cartStatus ? <p className="mt-3 text-sm text-gray-300">{cartStatus}</p> : null}
         </div>
-      </aside>
+          </aside>
 
-        <main className="order-1 flex min-h-0 min-w-0 flex-1 flex-col bg-[#181818] md:order-2 md:px-6 md:py-6">
+          <main className="order-2 flex min-h-0 min-w-0 flex-1 flex-col bg-[#181818] px-3 py-3 md:px-6 md:py-6">
           <div
             ref={previewPaneRef}
-            className="flex h-full min-h-[420px] w-full max-w-full items-center justify-center overflow-hidden px-2 py-3 md:min-h-0 md:px-4 md:py-4"
+            className="flex h-full min-h-0 w-full max-w-full items-center justify-center overflow-hidden px-2 py-2 md:min-h-0 md:px-4 md:py-4"
           >
             <div
               className={getPreviewStageClassName(currentView)}
               style={{
                 width: `${CANVAS_DEFAULT_WIDTH}px`,
                 height: `${CANVAS_DEFAULT_HEIGHT}px`,
                 transform: `scale(${previewScale})`,
                 transformOrigin: "center center",
               }}
             >
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img
                   src={resolvedMockupUrl}
                   alt={`${VIEW_LABELS[currentView]} mockup`}
                   className={getMockupImageClassName()}
                   style={{
                     width: `${mockupRender.renderedWidth}px`,
                     height: `${mockupRender.renderedHeight}px`,
                     left: "50%",
                     top: "50%",
                     transform: "translate(-50%, -50%)",
                   }}
                   onLoad={(event) => {
                     const image = event.currentTarget;
                     const naturalWidth = image.naturalWidth || 0;
                     const naturalHeight = image.naturalHeight || 0;
                     setMockupNaturalSize((prev) =>
                       prev.width === naturalWidth && prev.height === naturalHeight
                         ? prev
                         : { width: naturalWidth, height: naturalHeight }
                     );
                   }}
                 />
                 <div
                   className="pointer-events-none absolute z-20 border border-dashed border-cyan-400"
                   style={{
                     left: `${resolvedPrintAreaBounds.left}px`,
                     top: `${resolvedPrintAreaBounds.top}px`,
                     width: `${resolvedPrintAreaBounds.width}px`,
                     height: `${resolvedPrintAreaBounds.height}px`,
                   }}
                 />
                 <canvas ref={canvasElRef} className="relative z-10" />
               </div>
             </div>
-        </main>
+          </main>
+        </div>
       </div>
     </div>
   );
 }
