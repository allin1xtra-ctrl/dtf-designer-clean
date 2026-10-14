"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { premiumMockupAssets } from "@/lib/premium-mockup-assets";
import printZones from "@/lib/print-zones.json";
import { clamp, EMPTY_PROJECT, FONTS, GarmentId, Layer, layerWarnings, MAX_FILE_BYTES, MAX_PROJECT_BYTES, parseProject, Project, VIEW_IDS, ViewId } from "./design-model";
import styles from "./designer.module.css";

type PrintZone = { frameInches: number; center: number[]; width: number; exclude?: number[][]; region?: { ellipse: number[]; minY: number } };
const ZONES = printZones as Record<GarmentId, Partial<Record<ViewId, PrintZone>>>;
const GARMENT_LABELS: Record<GarmentId, string> = { "t-shirts": "T-shirt", hoodies: "Hoodie", pants: "Sweatpants", shorts: "Shorts" };
const VIEW_LABELS: Record<ViewId, string> = { front: "Front", back: "Back", leftSleeve: "Left sleeve", rightSleeve: "Right sleeve", neckTag: "Neck tag", leftLeg: "Left leg", rightLeg: "Right leg" };
const GARMENT_COLORS: Record<string, { label: string; swatch: string; dark: boolean }> = {
  black: { label: "Black", swatch: "#111111", dark: true }, white: { label: "White", swatch: "#f7f7f5", dark: false },
  "heather-grey": { label: "Heather grey", swatch: "#a9a9a6", dark: false }, "regular-grey": { label: "Grey", swatch: "#6f7173", dark: true },
  "royal-blue": { label: "Royal blue", swatch: "#1f4f8f", dark: true }, red: { label: "Red", swatch: "#a3161b", dark: true },
  "off-white": { label: "Off-white", swatch: "#ece6d8", dark: false },
};
const COLOR_ORDER = Object.keys(GARMENT_COLORS);
const STORAGE_KEY = "true-authentic-design-v2";
const LEGACY_STORAGE_KEY = "true-authentic-design-v1";
const MAX_EXPORT_PIXELS = 16_000_000;

function garmentImage(garment: GarmentId, color: string, view: ViewId) {
  return premiumMockupAssets.find(asset => asset.productId === garment && asset.colorId === color && asset.view === view);
}
function garmentColors(garment: GarmentId) {
  return COLOR_ORDER.filter(color => garmentImage(garment, color, "front"));
}
function garmentViews(garment: GarmentId) {
  return VIEW_IDS.filter(view => ZONES[garment][view] && premiumMockupAssets.some(asset => asset.productId === garment && asset.view === view));
}
function maskUrl(garment: GarmentId, color: string, view: ViewId) {
  return `/premium-mockups/v1/print-masks/${garment}/${color}-${view}.png`;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(source: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(source); if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image);
    image.onerror = () => { imageCache.delete(source); reject(new Error("This image could not be read. Please use a valid PNG, JPG or WebP.")); }; image.src = source;
  });
  if (imageCache.size > 60) imageCache.clear();
  imageCache.set(source, promise); return promise;
}
function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The file could not be read.")); reader.readAsDataURL(file);
  });
}
/** Draws one layer onto a canvas whose full size represents the whole garment frame. */
async function drawLayer(context: CanvasRenderingContext2D, layer: Layer, frameWidth: number, frameHeight: number) {
  const width = layer.width / 100 * frameWidth, height = layer.height / 100 * frameHeight;
  context.save(); context.translate(layer.x / 100 * frameWidth, layer.y / 100 * frameHeight); context.rotate(layer.rotation * Math.PI / 180);
  if (layer.type === "image") context.drawImage(await loadImage(layer.source!), -width / 2, -height / 2, width, height);
  else {
    context.fillStyle = layer.color!; context.textAlign = "center"; context.textBaseline = "middle";
    context.font = `bold ${height * 0.8}px "${layer.font}"`;
    const measured = context.measureText(layer.text || " ").width;
    context.scale(width / Math.max(measured, 1), 1); context.fillText(layer.text || "", 0, 0);
  }
  context.restore();
}
function layerBounds(layer: Layer) {
  const radians = layer.rotation * Math.PI / 180;
  const halfW = (Math.abs(Math.cos(radians) * layer.width) + Math.abs(Math.sin(radians) * layer.height)) / 2;
  const halfH = (Math.abs(Math.sin(radians) * layer.width) + Math.abs(Math.cos(radians) * layer.height)) / 2;
  return { left: layer.x - halfW, right: layer.x + halfW, top: layer.y - halfH, bottom: layer.y + halfH };
}

/** Finds layers that reach a waistband, cuff, neck tape or off the garment for the chosen garment and color. */
async function printableWarnings(project: Project, garment: GarmentId, color: string): Promise<string[]> {
  const SIZE = 200, warnings: string[] = [];
  const canvas = document.createElement("canvas"); canvas.width = SIZE; canvas.height = SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) return warnings;
  for (const view of garmentViews(garment)) {
    const layers = project.views[view] ?? [];
    if (!layers.length || !garmentImage(garment, color, view)) continue;
    context.clearRect(0, 0, SIZE, SIZE); context.drawImage(await loadImage(maskUrl(garment, color, view)), 0, 0, SIZE, SIZE);
    const mask = context.getImageData(0, 0, SIZE, SIZE).data;
    for (const layer of layers) {
      context.clearRect(0, 0, SIZE, SIZE); await drawLayer(context, layer, SIZE, SIZE);
      const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
      let inked = 0, blocked = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 40) { inked++; if (mask[i] < 128) blocked++; }
      if (inked && blocked / inked > 0.01) warnings.push(view === "neckTag"
        ? `${VIEW_LABELS[view]} · ${layer.name}: part of this layer is above the neck tape or outside the neck tag area and will not print.`
        : `${VIEW_LABELS[view]} · ${layer.name}: part of this layer is on a waistband, cuff or off the garment and will not print.`);
    }
  }
  return warnings;
}

export default function TrueAuthenticDesigner() {
  const [project, setProject] = useState<Project>(EMPTY_PROJECT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose your garment, then add your artwork or text anywhere on it.");
  const [busy, setBusy] = useState(false);
  const [savedAvailable, setSavedAvailable] = useState(false);
  const [garment, setGarment] = useState<GarmentId>("t-shirts");
  const [garmentColor, setGarmentColor] = useState("black");
  const [garmentView, setGarmentView] = useState<ViewId>("front");
  const [zoneWarnings, setZoneWarnings] = useState<string[]>([]);
  const [history, setHistory] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; initial: Project } | null>(null);

  const colorOptions = garmentColors(garment);
  const viewOptions = garmentViews(garment);
  const activeView: ViewId = viewOptions.includes(garmentView) && garmentImage(garment, garmentColor, garmentView) ? garmentView : "front";
  const garmentAsset = garmentImage(garment, garmentColor, activeView) ?? garmentImage(garment, "black", "front")!;
  const zone = ZONES[garment][activeView]!;
  const colorLabel = GARMENT_COLORS[garmentColor]?.label ?? "Black";
  const layers = project.views[activeView] ?? [];
  const current = layers.find(layer => layer.id === selectedId);
  const hasArtwork = Object.values(project.views).some(list => list?.length);
  const frameWarnings = viewOptions.flatMap(view => {
    const list = project.views[view] ?? [];
    const frame = ZONES[garment][view]!.frameInches;
    return layerWarnings({ version: 1, width: frame, height: frame, layers: list }).filter(w => !w.includes("outside the print area")).map(w => `${VIEW_LABELS[view]} · ${w}`);
  });
  const warnings = [...zoneWarnings, ...frameWarnings];
  const [centerX, centerY] = zone.center;
  const viewHeight = 1000;

  useEffect(() => { try { setSavedAvailable(Boolean(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY))); } catch { /* Optional storage. */ } }, []);
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      printableWarnings(project, garment, garmentColor).then(list => { if (!cancelled) setZoneWarnings(list); }).catch(() => { if (!cancelled) setZoneWarnings([]); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [project, garment, garmentColor]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.parent === window) return;
    let frame = 0, last = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.ceil(root.getBoundingClientRect().height) + 24;
        if (Math.abs(height - last) < 4) return;
        last = height;
        for (const origin of ["https://www.ta-apparel.com", "https://ta-apparel.com"])
          window.parent.postMessage({ type: "TA_DESIGNER_RESIZE", height }, origin);
      });
    });
    observer.observe(root); return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  function commit(next: Project) {
    setHistory(previous => [...previous.slice(-19), project]); setFuture([]); setProject(next);
  }
  function withLayers(next: Layer[], base: Project = project): Project {
    return { ...base, views: { ...base.views, [activeView]: next } };
  }
  function updateLayer(patch: Partial<Layer>) {
    if (!current) return;
    commit(withLayers(layers.map(layer => layer.id === current.id ? { ...layer, ...patch } : layer)));
  }
  function undo() {
    if (!history.length) return;
    setFuture(previous => [project, ...previous]); setProject(history[history.length - 1]); setHistory(history.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory(previous => [...previous.slice(-19), project]); setProject(future[0]); setFuture(future.slice(1));
  }
  function chooseGarment(next: GarmentId) {
    setGarment(next); setSelectedId(null);
    if (!garmentColors(next).includes(garmentColor)) setGarmentColor("black");
    if (!garmentViews(next).includes(garmentView)) setGarmentView("front");
  }
  function chooseView(next: ViewId) { setGarmentView(next); setSelectedId(null); }
  async function upload(file?: File) {
    if (!file || busy) return;
    if (layers.length >= 20) { setStatus("Limit reached: remove a layer from this side before adding more (20 maximum)."); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setStatus("Use a PNG, JPG or WebP image. SVG and animated files are not supported in this editor."); return; }
    if (file.size > MAX_FILE_BYTES) { setStatus("This file is too large. Please use an image under 10 MB."); return; }
    setBusy(true);
    try {
      const source = await readImage(file), image = await loadImage(source);
      if (image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error("Image dimensions exceed 12,000 pixels. Please resize the original.");
      if (JSON.stringify(project).length + source.length > MAX_PROJECT_BYTES) throw new Error("This project is too large. Use smaller images (25 MB total maximum).");
      const ratio = image.naturalWidth / image.naturalHeight;
      const width = ratio >= 1 ? zone.width : zone.width * ratio;
      const height = ratio >= 1 ? zone.width / ratio : zone.width;
      if (width < 1 || height < 1) throw new Error("This image is too narrow. Crop it first.");
      const layer: Layer = { id: crypto.randomUUID(), type: "image", name: file.name.slice(0, 200), source, pixelsWide: image.naturalWidth, x: centerX, y: centerY, width, height, rotation: 0 };
      commit(withLayers([...layers, layer])); setSelectedId(layer.id);
      setStatus(`${file.name} added to the ${VIEW_LABELS[activeView].toLowerCase()}. Drag it anywhere on the garment or use the position controls.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed. Please try another image."); }
    finally { setBusy(false); }
  }
  function addText() {
    if (layers.length >= 20) { setStatus("Remove a layer from this side before adding more (20 maximum)."); return; }
    const color = GARMENT_COLORS[garmentColor]?.dark ? "#ffffff" : "#111111";
    const layer: Layer = { id: crypto.randomUUID(), type: "text", name: "Text", text: "YOUR DESIGN", font: "Arial", color, x: centerX, y: centerY, width: zone.width, height: Math.max(2, zone.width * 0.18), rotation: 0 };
    commit(withLayers([...layers, layer])); setSelectedId(layer.id); setStatus("Text added. Edit the words in the selected layer panel.");
  }
  function savedProject(): Project { return { ...project, garment, color: garmentColor }; }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedProject())); setSavedAvailable(true); setStatus("Saved on this browser. Use Download project for a portable backup."); }
    catch { setStatus("Browser storage is full or unavailable. Use Download project to keep your design."); }
  }
  async function restore(raw: string) {
    setBusy(true);
    try {
      const next = parseProject(raw);
      for (const list of Object.values(next.views)) for (const layer of list ?? []) if (layer.type === "image") {
        const image = await loadImage(layer.source!);
        if (image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error("A project image exceeds 12,000 pixels.");
        layer.pixelsWide = image.naturalWidth;
      }
      commit(next); setGarment(next.garment);
      setGarmentColor(garmentColors(next.garment).includes(next.color) ? next.color : "black");
      const firstView = garmentViews(next.garment).find(view => next.views[view]?.length) ?? "front";
      setGarmentView(firstView); setSelectedId(next.views[firstView]?.[0]?.id || null);
      setStatus("Project opened. Your artwork, text and placement are restored on every side.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to open this project."); }
    finally { setBusy(false); }
  }
  async function exportPng() {
    if (!layers.length || busy) return;
    setBusy(true); setStatus(`Preparing your ${VIEW_LABELS[activeView].toLowerCase()} PNG…`);
    try {
      const frame = zone.frameInches;
      const bounds = layers.map(layerBounds).reduce((a, b) => ({ left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) }));
      const left = clamp(bounds.left, 0, 100), right = clamp(bounds.right, 0, 100), top = clamp(bounds.top, 0, 100), bottom = clamp(bounds.bottom, 0, 100);
      const inchesWide = (right - left) / 100 * frame, inchesHigh = (bottom - top) / 100 * frame;
      if (inchesWide <= 0 || inchesHigh <= 0) throw new Error("Move your artwork onto the garment before downloading.");
      let dpi = 300;
      if (inchesWide * inchesHigh * dpi * dpi > MAX_EXPORT_PIXELS) dpi = Math.floor(Math.sqrt(MAX_EXPORT_PIXELS / (inchesWide * inchesHigh)));
      if (dpi < 100) throw new Error("This design is too large to download in one file. Reduce its size or split it across layers.");
      const canvas = document.createElement("canvas"); canvas.width = Math.round(inchesWide * dpi); canvas.height = Math.round(inchesHigh * dpi);
      const context = canvas.getContext("2d"); if (!context) throw new Error("Your browser could not create the download.");
      const framePixels = frame * dpi;
      context.translate(-left / 100 * framePixels, -top / 100 * framePixels);
      for (const layer of layers) await drawLayer(context, layer, framePixels, framePixels);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG export failed. Try a smaller design.")), "image/png"));
      download(blob, `true-authentic-${garment}-${activeView}-${inchesWide.toFixed(1)}x${inchesHigh.toFixed(1)}in-${dpi}dpi.png`);
      canvas.width = 0; canvas.height = 0;
      setStatus(`${VIEW_LABELS[activeView]} PNG downloaded with a transparent background (about ${inchesWide.toFixed(1)} × ${inchesHigh.toFixed(1)} in at ${dpi} DPI). Switch sides to download the others.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Download failed. Please try again."); }
    finally { setBusy(false); }
  }
  function coordinates(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 };
  }
  const mask = `url(${maskUrl(garment, garmentColor, activeView)})`;

  return <div className={styles.root} ref={rootRef}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>TRUE AUTHENTIC • DESIGN STUDIO</span><h1>Your artwork. Your way.</h1><p>Create your own custom T-shirts, hoodies, sweatpants, and shorts.</p></div>
      <a href="https://www.ta-apparel.com/pages/contact" target="_top">Ask about a custom order ↗</a>
    </header>
    <div className={styles.workspace}>
      <aside className={styles.panel}>
        <h2><span>1</span> Set up your design</h2>
        <p className={styles.muted}>Customize your apparel. Garment availability and pricing are confirmed with your order.</p>
        <button className={styles.primary} disabled={busy} onClick={() => uploadRef.current?.click()}>{busy ? "Working…" : "Upload artwork"}</button>
        <input ref={uploadRef} className={styles.file} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload artwork file" onChange={event => { void upload(event.target.files?.[0]); event.target.value=""; }} />
        <p className={styles.muted}>PNG, JPG or WebP · up to 10 MB. Transparent PNG works best.</p>
        <button disabled={busy} onClick={addText}>Add text</button>
        <h3>Layers on {VIEW_LABELS[activeView].toLowerCase()} <small>{layers.length}/20</small></h3>
        {layers.length === 0 && <p className={styles.muted}>Your artwork and text for this side will appear here.</p>}
        <div className={styles.layers}>{layers.map(layer => <button key={layer.id} aria-pressed={selectedId===layer.id} onClick={() => setSelectedId(layer.id)}>{layer.type==="text" ? layer.text || "Text" : layer.name}</button>)}</div>
        {current && <fieldset disabled={busy} className={styles.selection}><legend>Edit selected layer</legend>
          {current.type === "text" && <>
            <label>Your text<input maxLength={80} value={current.text} onChange={event => updateLayer({text:event.target.value})}/></label>
            <label>Font<select value={current.font} onChange={event => updateLayer({font:event.target.value})}>{FONTS.map(font => <option key={font}>{font}</option>)}</select></label>
            <label>Text color<input type="color" value={current.color} onChange={event => updateLayer({color:event.target.value})}/></label>
          </>}
          <label>Width: {Math.round(current.width)}%<input type="range" min={1} max={100} value={current.width} onChange={event => {
            const width=Number(event.target.value); const height=current.height*width/current.width;
            if(height>=1 && height<=100) updateLayer({width,height});
          }}/></label>
          <label>Horizontal position<input type="range" min={0} max={100} value={current.x} onChange={event=>updateLayer({x:Number(event.target.value)})}/></label>
          <label>Vertical position<input type="range" min={0} max={100} value={current.y} onChange={event=>updateLayer({y:Number(event.target.value)})}/></label>
          <label>Rotation: {current.rotation}°<input type="range" min={-180} max={180} value={current.rotation} onChange={event=>updateLayer({rotation:Number(event.target.value)})}/></label>
          <div className={styles.row}><button onClick={()=>updateLayer({x:centerX,y:centerY})}>Center</button><button onClick={()=>{commit(withLayers(layers.filter(l=>l.id!==current.id)));setSelectedId(null);}}>Delete layer</button></div>
        </fieldset>}
      </aside>
      <section className={styles.canvasPanel}>
        <div className={styles.canvasHeader}><h2><span>2</span> Make it yours</h2><div className={styles.row}><button disabled={!history.length || busy} onClick={undo}>Undo</button><button disabled={!future.length || busy} onClick={redo}>Redo</button></div></div>
        <label>Preview garment<select value={garment} onChange={event => chooseGarment(event.target.value as GarmentId)}>{Object.entries(GARMENT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <div role="group" aria-label="Garment color" className={styles.row}>{colorOptions.map(color => <button key={color} type="button" aria-pressed={garmentColor===color} aria-label={GARMENT_COLORS[color].label} title={GARMENT_COLORS[color].label} onClick={() => setGarmentColor(color)}
          style={{ width: 36, height: 36, minWidth: 36, minHeight: 36, maxHeight: 36, flex: "0 0 36px", aspectRatio: "1", padding: 0, borderRadius: "50%", background: GARMENT_COLORS[color].swatch, boxShadow: garmentColor===color ? "0 0 0 2px #fff, 0 0 0 4px #e8ba85" : "inset 0 0 0 1px rgba(0,0,0,.35)" }} />)}</div>
        <div role="group" aria-label="Print location" className={styles.row} style={{ marginTop: 10 }}>{viewOptions.map(view => {
          const available = Boolean(garmentImage(garment, garmentColor, view)); const count = project.views[view]?.length ?? 0;
          return <button key={view} type="button" aria-pressed={activeView===view} disabled={!available} title={available ? undefined : "Not available in this color yet"} onClick={() => chooseView(view)}>{VIEW_LABELS[view]}{count ? ` (${count})` : ""}</button>;
        })}</div>
        <p className={styles.muted}>{colorLabel} {GARMENT_LABELS[garment].toLowerCase()} · {VIEW_LABELS[activeView].toLowerCase()}{viewOptions.some(view => !garmentImage(garment, garmentColor, view)) ? " · some locations are not yet available in this color" : ""}</p>
        <p className={styles.muted}>{activeView === "neckTag" ? "Neck tag artwork prints below the neck tape." : "Design anywhere on the garment. Waistbands and cuffs can't be printed."} Illustrative placement only; garment proportions and printed colors may differ.</p>
        <div className={`${styles.stage} ${styles.shirt}`}>
          <NextImage key={garmentAsset.url} src={garmentAsset.url} alt={`Unbranded premium oversized ${colorLabel.toLowerCase()} ${GARMENT_LABELS[garment]}, ${VIEW_LABELS[activeView].toLowerCase()} view, for an illustrative placement preview`} fill sizes="(max-width: 800px) min(500px, calc(100vw - 58px)), (max-width: 1040px) calc(100vw - 388px), 650px" className={styles.mockup} />
          <svg ref={svgRef} className={styles.canvas} data-print-location={activeView}
            style={{ aspectRatio: "1", top: 0, left: 0, width: "100%", maxHeight: "100%", maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}
            viewBox={`0 0 1000 ${viewHeight}`} role="group" aria-label="Design canvas"
            onPointerMove={event=>{
              if(!drag.current) return; const point=coordinates(event.clientX,event.clientY); const info=drag.current;
              setProject(value=>({...value,views:{...value.views,[activeView]:(value.views[activeView] ?? []).map(layer=>layer.id===info.id ? {...layer,x:clamp(point.x-info.x,0,100),y:clamp(point.y-info.y,0,100)} : layer)}}));
            }}
            onPointerUp={()=>{if(drag.current){const initial=drag.current.initial;setHistory(h=>[...h.slice(-19),initial]);setFuture([]);drag.current=null;}}}
            onPointerCancel={()=>{if(drag.current){setProject(drag.current.initial);drag.current=null;}}}>
            {layers.map(layer=>{
              const w=layer.width*10,h=layer.height/100*viewHeight;
              return <g key={layer.id} role="button" tabIndex={0} aria-label={`Select ${layer.name}`} aria-pressed={selectedId===layer.id} transform={`translate(${layer.x*10},${layer.y/100*viewHeight}) rotate(${layer.rotation})`}
                onFocus={()=>setSelectedId(layer.id)} onKeyDown={event=>{if(event.key==="Enter" || event.key===" "){event.preventDefault();setSelectedId(layer.id);}}}
                onPointerDown={event=>{if(busy)return;event.preventDefault();setSelectedId(layer.id);const p=coordinates(event.clientX,event.clientY);drag.current={id:layer.id,x:p.x-layer.x,y:p.y-layer.y,initial:project};svgRef.current?.setPointerCapture(event.pointerId);}}>
                {layer.type==="image" ? <image href={layer.source} x={-w/2} y={-h/2} width={w} height={h} preserveAspectRatio="none"/> :
                  <text textAnchor="middle" dominantBaseline="central" fontFamily={layer.font} fontWeight="bold" fontSize={h*0.8} fill={layer.color} textLength={layer.text ? w : undefined} lengthAdjust="spacingAndGlyphs">{layer.text}</text>}
                <rect x={-w/2} y={-h/2} width={w} height={h} fill="transparent" stroke="none"/>
              </g>;
            })}
          </svg>
          {layers.length===0 && <svg aria-hidden="true" viewBox="0 0 1000 1000" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <text x={centerX*10} y={centerY*10} textAnchor="middle" dominantBaseline="central" fontSize={activeView === "neckTag" ? 30 : 26} fontWeight={600} fill={GARMENT_COLORS[garmentColor]?.dark ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.55)"}>Upload artwork or add text</text>
          </svg>}
        </div>
        <div className={styles.status} role="status" aria-live="polite">{status}</div>
      </section>
      <section className={styles.review}>
        <h2><span>3</span> Review & keep your design</h2>
        {warnings.length>0 && <div className={styles.warning}><strong>Review before printing</strong><ul>{warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
        <p>Download a transparent PNG of the side you are viewing. Keep a project file to reopen and edit every side later.</p>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={busy || !layers.length} onClick={()=>void exportPng()}>Download {VIEW_LABELS[activeView].toLowerCase()} PNG</button>
          <button disabled={busy || !hasArtwork} onClick={()=>{download(new Blob([JSON.stringify(savedProject())],{type:"application/json"}),"true-authentic-design.json");setStatus("Project downloaded. Use Open project to restore it, including your images on every side.");}}>Download project</button>
          <button disabled={busy || !hasArtwork} onClick={save}>Save on this device</button>
          {savedAvailable && <button disabled={busy} onClick={()=>{try{void restore(localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_STORAGE_KEY)||"");}catch{setStatus("Browser storage is unavailable. Open a downloaded project instead.");}}}>Restore device save</button>}
          <button disabled={busy} onClick={()=>importRef.current?.click()}>Open project</button>
        </div>
        <input ref={importRef} type="file" accept=".json,application/json" aria-label="Open saved project file" className={styles.file} onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;if(file.size>MAX_PROJECT_BYTES){setStatus("Projects must be under 25 MB.");return;}try{await restore(await file.text());}catch{setStatus("Could not read this project file.");}}}/>
        <div className={styles.service}><div><h3>Ready to make it real?</h3><p>Contact True Authentic about your custom order. Keep your original artwork and downloaded project. Pricing, garment options and production details are confirmed before ordering.</p></div><a href="https://www.ta-apparel.com/pages/contact" target="_top">Contact True Authentic ↗</a></div>
        <p className={styles.muted}>Your artwork stays in this browser unless you choose to send it. Downloads do not place an order. Artwork quality still needs review before printing.</p>
      </section>
    </div>
  </div>;
}
