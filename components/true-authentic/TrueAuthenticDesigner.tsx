"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, Design, FONTS, Layer, layerWarnings, MAX_FILE_BYTES, MAX_PROJECT_BYTES } from "./design-model";
import styles from "./apparel.module.css";
import { changeGarment, apparelCatalog, ApparelProject, Catalog, emptyProject, FALLBACK_CATALOG, mockupUrl, parseProject, printArea, View, VIEWS, VIEW_LABELS } from "./apparel-model";

const STORAGE_KEY = "true-authentic-apparel-v2";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be read. Please use a valid PNG, JPG or WebP.")); image.src = source;
  });
}
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The file could not be read.")); reader.readAsDataURL(file);
  });
}

export default function TrueAuthenticDesigner() {
  const [project, setProject] = useState<ApparelProject>(() => emptyProject());
  const [activeView, setActiveView] = useState<View>("front");
  const [catalog, setCatalog] = useState<Catalog>(FALLBACK_CATALOG);
  const [catalogStatus, setCatalogStatus] = useState("Loading garment mockups…");
  const [panel, setPanel] = useState<"product" | "edit" | "save" | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const design = project.views[activeView];
  const variant = catalog.variants.find(item => item.id === project.variantId);
  const area = printArea(variant, activeView);
  const garmentImage = mockupUrl(variant, activeView);
  const editable = variant?.editableViews?.[activeView] !== false;
  function setDesign(next: Design | ((previous: Design) => Design)) {
    setProject(previous => ({ ...previous, views: { ...previous.views, [activeView]: typeof next === "function" ? next(previous.views[activeView]) : next } }));
  }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose a garment area, then upload artwork or add text.");
  const [busy, setBusy] = useState(false);
  const [savedAvailable, setSavedAvailable] = useState(false);
  const [preview, setPreview] = useState<"print" | "shirt">("shirt");
  const [history, setHistory] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog=dialogRef.current; if (!dialog) return; if(panel && !dialog.open) dialog.showModal(); if(!panel && dialog.open) dialog.close(); }, [panel]);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; initial: Design } | null>(null);
  const current = design.layers.find(layer => layer.id === selectedId);
  const warnings = layerWarnings(design);
  const viewHeight = 1000 * design.height / design.width;
  const fitWidth = Math.min(area.width, area.height * design.width / design.height);
  const fitHeight = fitWidth * design.height / design.width;
  const totalLayers = VIEWS.reduce((sum, view) => sum + project.views[view].layers.length, 0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customizer/mockups", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(value => {
        if (!Array.isArray(value.products) || !Array.isArray(value.variants)) throw new Error();
        const next = apparelCatalog(value); setCatalog(next);
        setProject(previous => VIEWS.every(view=>previous.views[view].layers.length===0) && !next.variants.some(v=>v.id===previous.variantId) ? emptyProject(next.variants[0]) : previous);
        setCatalogStatus(next === FALLBACK_CATALOG ? "Built-in T-shirt previews · availability confirmed with your order" : "Garment mockups managed by True Authentic");
      }).catch(() => { if (!controller.signal.aborted) setCatalogStatus("Live mockups unavailable. Built-in T-shirt previews are available."); });
    return () => controller.abort();
  }, []);

  function switchView(view: View) {
    if (busy) return;
    setActiveView(view); setSelectedId(null); setHistory([]); setFuture([]); setImageFailed(false);
    setStatus(`${VIEW_LABELS[view]} selected. Each garment area keeps its own artwork.`);
  }
  function chooseVariant(id: string) {
    const next = catalog.variants.find(item => item.id === id); if (!next) return;
    setProject(previous => changeGarment(previous, next)); setHistory([]); setFuture([]);
    setImageFailed(false); setStatus("Garment updated. Your artwork is preserved on every side; review placement before ordering.");
  }

  useEffect(() => { try { setSavedAvailable(Boolean(localStorage.getItem(STORAGE_KEY))); } catch { /* Optional storage. */ } }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.parent === window) return;
    let frame = 0, last = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(root.getBoundingClientRect().height);
        if (Math.abs(height - last) < 4) return;
        last = height;
        for (const origin of ["https://www.ta-apparel.com", "https://ta-apparel.com"])
          window.parent.postMessage({ type: "TA_DESIGNER_RESIZE", height }, origin);
      });
    });
    observer.observe(root); return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  function commit(next: Design) {
    setHistory(previous => [...previous.slice(-19), design]); setFuture([]); setDesign(next);
  }
  function updateLayer(patch: Partial<Layer>) {
    if (!current) return;
    commit({ ...design, layers: design.layers.map(layer => layer.id === current.id ? { ...layer, ...patch } : layer) });
  }
  function undo() {
    if (!history.length) return;
    setFuture(previous => [design, ...previous]); setDesign(history[history.length - 1]); setHistory(history.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory(previous => [...previous.slice(-19), design]); setDesign(future[0]); setFuture(future.slice(1));
  }
  async function upload(file?: File) {
    if (!file || busy) return;
    if (design.layers.length >= 20) { setStatus("Limit reached: remove a layer before adding more (20 maximum)."); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setStatus("Use a PNG, JPG or WebP image. SVG and animated files are not supported in this editor."); return; }
    if (file.size > MAX_FILE_BYTES) { setStatus("This file is too large. Please use an image under 10 MB."); return; }
    setBusy(true);
    try {
      const source = await readImage(file), image = await loadImage(source);
      if (image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error("Image dimensions exceed 12,000 pixels. Please resize the original.");
      if (JSON.stringify(project).length + source.length > MAX_PROJECT_BYTES) throw new Error("This project is too large. Use smaller images (25 MB total maximum).");
      const physicalRatio = (image.naturalWidth / image.naturalHeight) / (design.width / design.height);
      const width = physicalRatio >= 1 ? 70 : 70 * physicalRatio;
      const height = physicalRatio >= 1 ? 70 / physicalRatio : 70;
      if (width < 1 || height < 1) throw new Error("This image is too narrow for the print area. Crop it first.");
      const layer: Layer = { id: crypto.randomUUID(), type: "image", name: file.name.slice(0,200), source, pixelsWide: image.naturalWidth, x: 50, y: 50, width, height, rotation: 0 };
      commit({ ...design, layers: [...design.layers, layer] }); setSelectedId(layer.id); setStatus(`${file.name} added. Drag it on the canvas or use the position controls.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed. Please try another image."); }
    finally { setBusy(false); }
  }
  function addText() {
    if (design.layers.length >= 20) { setStatus("Remove a layer before adding more (20 maximum)."); return; }
    const layer: Layer = { id: crypto.randomUUID(), type: "text", name: "Text", text: "YOUR DESIGN", font: "Arial", color: variant?.colorSlug === "white" ? "#111111" : "#ffffff", x: 50, y: 50, width: 70, height: 12, rotation: 0 };
    commit({ ...design, layers: [...design.layers, layer] }); setSelectedId(layer.id); setStatus("Text added. Edit the words in the selected layer panel.");
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); setSavedAvailable(true); setStatus("All five garment areas saved on this browser. Download the project for a portable backup."); }
    catch { setStatus("Browser storage is full or unavailable. Use Download project to keep your design."); }
  }
  async function restore(raw: string) {
    setBusy(true);
    try {
      const next = parseProject(raw);
      for (const layer of VIEWS.flatMap(view => next.views[view].layers)) if (layer.type === "image") {
        const image = await loadImage(layer.source!);
        if (image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error("A project image exceeds 12,000 pixels.");
        layer.pixelsWide = image.naturalWidth;
      }
      setProject(next); setActiveView("front"); setSelectedId(null); setHistory([]); setFuture([]);
      setStatus("Project opened. All garment areas restored. If a saved mockup is unavailable, choose an available garment.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to open this project."); }
    finally { setBusy(false); }
  }
  async function exportPng() {
    if (!design.layers.length || busy) return;
    setBusy(true); setStatus("Preparing your transparent PNG…");
    try {
      const canvas = document.createElement("canvas"); canvas.width = Math.round(design.width * 300); canvas.height = Math.round(design.height * 300);
      const context = canvas.getContext("2d"); if (!context) throw new Error("Your browser could not create the download.");
      for (const layer of design.layers) {
        const width = layer.width / 100 * canvas.width, height = layer.height / 100 * canvas.height;
        context.save(); context.translate(layer.x / 100 * canvas.width, layer.y / 100 * canvas.height); context.rotate(layer.rotation * Math.PI / 180);
        if (layer.type === "image") context.drawImage(await loadImage(layer.source!), -width/2, -height/2, width, height);
        else {
          context.fillStyle = layer.color!; context.textAlign = "center"; context.textBaseline = "middle";
          const fontSize = height * 0.8; context.font = `bold ${fontSize}px "${layer.font}"`;
          const measured = context.measureText(layer.text || " ").width;
          context.scale(width / Math.max(measured, 1), 1); context.fillText(layer.text || "", 0, 0);
        }
        context.restore();
      }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG export failed. Try a smaller print size.")), "image/png"));
      download(blob, `true-authentic-${activeView}-${design.width}x${design.height}in-${canvas.width}x${canvas.height}px.png`);
      canvas.width = 0; canvas.height = 0;
      setStatus("PNG downloaded with a transparent background. Set the printed size to your selected dimensions; download resolution cannot improve a low-resolution original.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Download failed. Please try again."); }
    finally { setBusy(false); }
  }
  function coordinates(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 50, y: 50 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x / 10, y: point.y / viewHeight * 100 };
  }


  return <div className={styles.root} ref={rootRef}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>TRUE AUTHENTIC</span><h1>Make it yours.</h1></div>
      <button onClick={()=>setPanel("product")} disabled={busy}>Garment & color</button>
      <button onClick={()=>setPanel("save")} disabled={busy}>Save & finish</button>
    </header>
    <nav className={styles.views} aria-label="Garment area">
      {VIEWS.map(view=><button key={view} disabled={busy} aria-pressed={activeView===view} onClick={()=>switchView(view)}>{VIEW_LABELS[view]}{project.views[view].layers.length>0 && <span className={styles.dot} aria-label="contains artwork">•</span>}</button>)}
    </nav>
    <main className={styles.workspace}>
      <aside className={styles.tools} aria-label="Add artwork">
        <button className={styles.primary} disabled={busy || !editable} onClick={()=>uploadRef.current?.click()}>Upload</button>
        <button disabled={busy || !editable} onClick={addText}>Add text</button>
        <button disabled={busy} onClick={()=>setPanel("edit")}>Layers <small>{design.layers.length}</small></button>
      </aside>
      <section className={styles.canvasPanel} aria-label="Garment preview">
        <div className={styles.canvasTitle}><strong>{VIEW_LABELS[activeView]}</strong><span>{design.width} × {design.height} in</span></div>
        <div className={styles.stage}>
          {preview==="shirt" && garmentImage && !imageFailed && <img src={garmentImage} onError={()=>setImageFailed(true)} alt={VIEW_LABELS[activeView]+" garment mockup"} className={styles.mockup} draggable={false}/>}
          {preview==="shirt" && (!garmentImage || imageFailed) && <div className={styles.missing}>Choose a garment with a {VIEW_LABELS[activeView].toLowerCase()} mockup.<br/>Your artwork is still saved. Use Artwork view to edit it.</div>}
          <div className={preview==="shirt" ? styles.garmentCanvas : styles.artworkCanvas}>
          <svg ref={svgRef} className={styles.canvas} style={preview === "shirt" ? {left: `${area.x-fitWidth/2}%`, top: `${area.y-fitHeight/2}%`, width: `${fitWidth}%`, height: `${fitHeight}%`} : {width:"100%",height:"100%"}} viewBox={`0 0 1000 ${viewHeight}`} role="group" aria-label="Design canvas"
            onPointerMove={event=>{
              if(!drag.current) return; const point=coordinates(event.clientX,event.clientY); const info=drag.current;
              setDesign(value=>({...value,layers:value.layers.map(layer=>layer.id===info.id ? {...layer,x:clamp(point.x-info.x,0,100),y:clamp(point.y-info.y,0,100)} : layer)}));
            }}
            onPointerUp={()=>{if(drag.current){const initial=drag.current.initial;setHistory(h=>[...h.slice(-19),initial]);setFuture([]);drag.current=null;}}}
            onPointerCancel={()=>{if(drag.current){setDesign(drag.current.initial);drag.current=null;}}}>
            {design.layers.length===0 && <text x={500} y={viewHeight/2} textAnchor="middle" fill="#666" fontSize={35}>Upload artwork or add text</text>}
            {design.layers.map(layer=>{
              const w=layer.width*10,h=layer.height/100*viewHeight;
              return <g key={layer.id} role="button" tabIndex={0} aria-label={`Select ${layer.name}`} aria-pressed={selectedId===layer.id} transform={`translate(${layer.x*10},${layer.y/100*viewHeight}) rotate(${layer.rotation})`}
                onFocus={()=>setSelectedId(layer.id)} onKeyDown={event=>{if(event.key==="Enter" || event.key===" "){event.preventDefault();setSelectedId(layer.id);}}}
                onPointerDown={event=>{if(busy || !editable)return;event.preventDefault();setSelectedId(layer.id);const p=coordinates(event.clientX,event.clientY);drag.current={id:layer.id,x:p.x-layer.x,y:p.y-layer.y,initial:design};svgRef.current?.setPointerCapture(event.pointerId);}}>
                {layer.type==="image" ? <image href={layer.source} x={-w/2} y={-h/2} width={w} height={h} preserveAspectRatio="none"/> :
                  <text textAnchor="middle" dominantBaseline="central" fontFamily={layer.font} fontWeight="bold" fontSize={h*0.8} fill={layer.color} textLength={layer.text ? w : undefined} lengthAdjust="spacingAndGlyphs">{layer.text}</text>}
                <rect x={-w/2} y={-h/2} width={w} height={h} fill="transparent" stroke={selectedId===layer.id ? "#db6b35" : "none"} strokeWidth={3} strokeDasharray="8 6"/>
              </g>;
            })}
          </svg>
          </div>
        </div>
        <div className={styles.viewOptions}><button aria-pressed={preview==="shirt"} onClick={()=>setPreview("shirt")}>Garment</button><button aria-pressed={preview==="print"} onClick={()=>setPreview("print")}>Artwork</button><button onClick={()=>setPanel("edit")} disabled={!current || busy}>Edit selected</button></div>
      </section>
      <aside className={styles.tools} aria-label="Arrange artwork">
        <button disabled={!history.length || busy} onClick={undo}>Undo</button>
        <button disabled={!future.length || busy} onClick={redo}>Redo</button>
        <button disabled={!current || busy || !editable} onClick={()=>updateLayer({x:50,y:50})}>Center</button>
        <button disabled={!current || busy || !editable} onClick={()=>{commit({...design,layers:design.layers.filter(l=>l.id!==current?.id)});setSelectedId(null);}}>Delete</button>
      </aside>
    </main>
    <footer className={styles.footer}>
      <div role="status" aria-live="polite" className={styles.status}>{!editable ? "This area is disabled for the selected garment. Your saved artwork is preserved." : status}</div>
      <button onClick={()=>setPanel("save")}>{warnings.length ? "Review "+warnings.length+" warning(s)" : "Review design"}</button>
    </footer>
    <input ref={uploadRef} className={styles.file} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload artwork file" onChange={event=>{void upload(event.target.files?.[0]);event.target.value="";}}/>
    <input ref={importRef} className={styles.file} type="file" accept=".json,application/json" aria-label="Open saved apparel project" onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;if(file.size>MAX_PROJECT_BYTES){setStatus("Projects must be under 25 MB.");return;}try{await restore(await file.text());}catch{setStatus("Could not read the project.");}}}/>
    <dialog ref={dialogRef} className={styles.dialog} onClose={()=>setPanel(null)}>
      <div className={styles.dialogHeader}><h2>{panel==="product" ? "Choose your garment" : panel==="edit" ? VIEW_LABELS[activeView]+" artwork" : "Save & review"}</h2><button aria-label="Close panel" onClick={()=>setPanel(null)}>Close</button></div>
      {panel==="product" && <>
        <p>{catalogStatus}</p>
        <label>Garment<select disabled={busy} value={variant?.productId || ""} onChange={e=>{const first=catalog.variants.find(v=>v.productId===e.target.value);if(first)chooseVariant(first.id);}}><option value="" disabled>Select garment</option>{catalog.products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>Color<select disabled={busy || !variant} value={variant?.id || ""} onChange={e=>chooseVariant(e.target.value)}>{catalog.variants.filter(v=>v.productId===variant?.productId).map(v=><option key={v.id} value={v.id}>{v.colorName}</option>)}</select></label>
        <p>Garment previews are illustrative. Availability and pricing are confirmed before ordering. Changing the garment keeps all five design areas.</p>
      </>}
      {panel==="edit" && <>
        <label>Layer<select value={selectedId || ""} onChange={e=>setSelectedId(e.target.value)}><option value="">Select a layer</option>{design.layers.map(l=><option key={l.id} value={l.id}>{l.type==="text" ? l.text || "Text" : l.name}</option>)}</select></label>
        {!current && <p>Upload artwork or add text to this garment area. Select a layer to edit its size, position and rotation.</p>}
        {current && <fieldset disabled={busy || !editable} className={styles.selection}>
          {current.type==="text" && <><label>Your text<input maxLength={80} value={current.text} onChange={e=>updateLayer({text:e.target.value})}/></label><label>Font<select value={current.font} onChange={e=>updateLayer({font:e.target.value})}>{FONTS.map(f=><option key={f}>{f}</option>)}</select></label><label>Text color<input type="color" value={current.color} onChange={e=>updateLayer({color:e.target.value})}/></label></>}
          <label>Width ({Math.round(current.width)}%)<input type="range" min={1} max={100} value={current.width} onChange={e=>{const width=Number(e.target.value),height=current.height*width/current.width;if(height>=1&&height<=100)updateLayer({width,height});}}/></label>
          <label>Horizontal position<input type="range" min={0} max={100} value={current.x} onChange={e=>updateLayer({x:Number(e.target.value)})}/></label>
          <label>Vertical position<input type="range" min={0} max={100} value={current.y} onChange={e=>updateLayer({y:Number(e.target.value)})}/></label>
          <label>Rotation ({current.rotation}°)<input type="range" min={-180} max={180} value={current.rotation} onChange={e=>updateLayer({rotation:Number(e.target.value)})}/></label>
        </fieldset>}
      </>}
      {panel==="save" && <>
        <p>{totalLayers} layers across your garment. Download the project to preserve front, back, both sleeves and neck together.</p>
        <div className={styles.actions}>
          <button disabled={busy || !totalLayers} onClick={save}>Save on this device</button>
          {savedAvailable && <button disabled={busy} onClick={()=>{try{void restore(localStorage.getItem(STORAGE_KEY)||"");}catch{setStatus("Browser storage unavailable.");}}}>Restore device save</button>}
          <button disabled={busy || !totalLayers} onClick={()=>{download(new Blob([JSON.stringify(project)],{type:"application/json"}),"true-authentic-apparel.json");setStatus("All five garment areas downloaded in one editable project.");}}>Download project</button>
          <button disabled={busy} onClick={()=>importRef.current?.click()}>Open project</button>
          <button disabled={busy || !design.layers.length} onClick={()=>void exportPng()}>Download {VIEW_LABELS[activeView]} PNG</button>
        </div>
        {VIEWS.map(view=>{const issues=layerWarnings(project.views[view]);return issues.length>0 && <div key={view} className={styles.warning}><strong>{VIEW_LABELS[view]}</strong><ul>{issues.map((w,i)=><li key={i}>{w}</li>)}</ul></div>;})}
        <p>PNG exports contain artwork for the selected area only, without the garment. Set the selected physical size when printing. Small originals do not gain detail from export.</p>
        <a href="https://www.ta-apparel.com/pages/contact" target="_top">Contact True Authentic about your apparel</a>
        <p>Your artwork stays in this browser. Saving or downloading does not submit an order. Keep the project and contact us to confirm garment sizes, quantities and pricing.</p>
      </>}
      <p className={styles.dialogStatus} role="status">{status}</p>
    </dialog>
  </div>;
}
