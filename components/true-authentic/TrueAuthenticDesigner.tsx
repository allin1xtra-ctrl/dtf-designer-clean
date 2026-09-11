"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, Design, EMPTY_DESIGN, FONTS, Layer, layerWarnings, MAX_FILE_BYTES, MAX_PROJECT_BYTES, parseDesign } from "./design-model";
import styles from "./designer.module.css";

const STORAGE_KEY = "true-authentic-design-v1";
const SIZES = [[3,3], [5,5], [8,10], [12,12], [12,16], [16,20]];
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
  const [design, setDesign] = useState<Design>(EMPTY_DESIGN);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Choose a print size, then add your artwork or text.");
  const [busy, setBusy] = useState(false);
  const [savedAvailable, setSavedAvailable] = useState(false);
  const [preview, setPreview] = useState<"print" | "shirt">("print");
  const [history, setHistory] = useState<Design[]>([]);
  const [future, setFuture] = useState<Design[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: string; x: number; y: number; initial: Design } | null>(null);
  const current = design.layers.find(layer => layer.id === selectedId);
  const warnings = layerWarnings(design);
  const viewHeight = 1000 * design.height / design.width;

  useEffect(() => { try { setSavedAvailable(Boolean(localStorage.getItem(STORAGE_KEY))); } catch { /* Optional storage. */ } }, []);
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
      if (JSON.stringify(design).length + source.length > MAX_PROJECT_BYTES) throw new Error("This project is too large. Use smaller images (25 MB total maximum).");
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
    const layer: Layer = { id: crypto.randomUUID(), type: "text", name: "Text", text: "YOUR DESIGN", font: "Arial", color: "#111111", x: 50, y: 50, width: 70, height: 12, rotation: 0 };
    commit({ ...design, layers: [...design.layers, layer] }); setSelectedId(layer.id); setStatus("Text added. Edit the words in the selected layer panel.");
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(design)); setSavedAvailable(true); setStatus("Saved on this browser. Use Download project for a portable backup."); }
    catch { setStatus("Browser storage is full or unavailable. Use Download project to keep your design."); }
  }
  async function restore(raw: string) {
    setBusy(true);
    try {
      const next = parseDesign(raw);
      for (const layer of next.layers) if (layer.type === "image") {
        const image = await loadImage(layer.source!);
        if (image.naturalWidth > 12000 || image.naturalHeight > 12000) throw new Error("A project image exceeds 12,000 pixels.");
        layer.pixelsWide = image.naturalWidth;
      }
      commit(next); setSelectedId(next.layers[0]?.id || null); setStatus("Project opened. Your artwork, text and placement are restored.");
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
      download(blob, `true-authentic-${design.width}x${design.height}in-${canvas.width}x${canvas.height}px.png`);
      canvas.width = 0; canvas.height = 0;
      setStatus("PNG downloaded with a transparent background. Set the printed size to your selected dimensions; download resolution cannot improve a low-resolution original.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Download failed. Please try again."); }
    finally { setBusy(false); }
  }
  function coordinates(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 };
  }

  return <div className={styles.root} ref={rootRef}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>TRUE AUTHENTIC • DESIGN STUDIO</span><h1>Your artwork. Your way.</h1><p>Create a print layout for custom apparel or DTF transfers.</p></div>
      <a href="https://www.ta-apparel.com/pages/contact" target="_top">Ask about a custom order ↗</a>
    </header>
    <div className={styles.workspace}>
      <aside className={styles.panel}>
        <h2><span>1</span> Set up your design</h2>
        <label>Print size (inches)<select aria-label="Print size" disabled={busy} value={`${design.width}x${design.height}`} onChange={event => {
          const [width,height] = event.target.value.split("x").map(Number);
          commit({ ...design, width, height, layers: design.layers.map(layer => ({ ...layer, height: clamp(layer.height * (height ? design.height/height : 1) * width/design.width,1,100) })) });
        }}>
          {!SIZES.some(([w,h]) => w===design.width && h===design.height) && <option>{design.width}x{design.height}</option>}
          {SIZES.map(([w,h]) => <option key={`${w}x${h}`} value={`${w}x${h}`}>{w} × {h}</option>)}
        </select></label>
        <p className={styles.muted}>Print area only. Garment availability and pricing are confirmed with your order.</p>
        <button className={styles.primary} disabled={busy} onClick={() => uploadRef.current?.click()}>{busy ? "Working…" : "Upload artwork"}</button>
        <input ref={uploadRef} className={styles.file} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload artwork file" onChange={event => { void upload(event.target.files?.[0]); event.target.value=""; }} />
        <p className={styles.muted}>PNG, JPG or WebP · up to 10 MB. Transparent PNG works best.</p>
        <button disabled={busy} onClick={addText}>Add text</button>
        <h3>Layers <small>{design.layers.length}/20</small></h3>
        {design.layers.length === 0 && <p className={styles.muted}>Your artwork and text will appear here.</p>}
        <div className={styles.layers}>{design.layers.map(layer => <button key={layer.id} aria-pressed={selectedId===layer.id} onClick={() => setSelectedId(layer.id)}>{layer.type==="text" ? layer.text || "Text" : layer.name}</button>)}</div>
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
          <div className={styles.row}><button onClick={()=>updateLayer({x:50,y:50})}>Center</button><button onClick={()=>{commit({...design,layers:design.layers.filter(l=>l.id!==current.id)});setSelectedId(null);}}>Delete layer</button></div>
        </fieldset>}
      </aside>
      <section className={styles.canvasPanel}>
        <div className={styles.canvasHeader}><h2><span>2</span> Make it yours</h2><div className={styles.row}><button disabled={!history.length || busy} onClick={undo}>Undo</button><button disabled={!future.length || busy} onClick={redo}>Redo</button></div></div>
        <div className={styles.row}><button aria-pressed={preview==="print"} onClick={()=>setPreview("print")}>Print layout</button><button aria-pressed={preview==="shirt"} onClick={()=>setPreview("shirt")}>T-shirt preview</button></div>
        <p className={styles.muted}>{preview==="shirt" ? "Illustrative placement only. Garment proportions and printed colors may differ." : "Drag a layer to position it, or use the controls. The checkerboard is transparent."}</p>
        <div className={`${styles.stage} ${preview==="shirt" ? styles.shirt : ""}`}>
          {preview==="shirt" && <img src="/customizer-preview/mockups/black-front.png" alt="Black T-shirt for an illustrative placement preview" className={styles.mockup} />}
          <svg ref={svgRef} className={styles.canvas} style={{aspectRatio:`${design.width}/${design.height}`}} viewBox={`0 0 1000 ${viewHeight}`} role="group" aria-label="Design canvas"
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
                onPointerDown={event=>{if(busy)return;event.preventDefault();setSelectedId(layer.id);const p=coordinates(event.clientX,event.clientY);drag.current={id:layer.id,x:p.x-layer.x,y:p.y-layer.y,initial:design};svgRef.current?.setPointerCapture(event.pointerId);}}>
                {layer.type==="image" ? <image href={layer.source} x={-w/2} y={-h/2} width={w} height={h} preserveAspectRatio="none"/> :
                  <text textAnchor="middle" dominantBaseline="central" fontFamily={layer.font} fontWeight="bold" fontSize={h*0.8} fill={layer.color} textLength={layer.text ? w : undefined} lengthAdjust="spacingAndGlyphs">{layer.text}</text>}
                <rect x={-w/2} y={-h/2} width={w} height={h} fill="transparent" stroke={selectedId===layer.id ? "#db6b35" : "none"} strokeWidth={3} strokeDasharray="8 6"/>
              </g>;
            })}
          </svg>
        </div>
        <p className={styles.dimensions}>{design.width} × {design.height} inches · {design.width*300} × {design.height*300} pixel download</p>
        <div className={styles.status} role="status" aria-live="polite">{status}</div>
      </section>
      <section className={styles.review}>
        <h2><span>3</span> Review & keep your design</h2>
        {warnings.length>0 && <div className={styles.warning}><strong>Review before printing</strong><ul>{warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
        <p>Download a transparent PNG of your print layout. Keep a project file to reopen and edit later.</p>
        <div className={styles.actions}>
          <button className={styles.primary} disabled={busy || !design.layers.length} onClick={()=>void exportPng()}>Download PNG</button>
          <button disabled={busy || !design.layers.length} onClick={()=>{download(new Blob([JSON.stringify(design)],{type:"application/json"}),"true-authentic-design.json");setStatus("Project downloaded. Use Open project to restore it, including your images.");}}>Download project</button>
          <button disabled={busy || !design.layers.length} onClick={save}>Save on this device</button>
          {savedAvailable && <button disabled={busy} onClick={()=>{try{void restore(localStorage.getItem(STORAGE_KEY)||"");}catch{setStatus("Browser storage is unavailable. Open a downloaded project instead.");}}}>Restore device save</button>}
          <button disabled={busy} onClick={()=>importRef.current?.click()}>Open project</button>
        </div>
        <input ref={importRef} type="file" accept=".json,application/json" aria-label="Open saved project file" className={styles.file} onChange={async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;if(file.size>MAX_PROJECT_BYTES){setStatus("Projects must be under 25 MB.");return;}try{await restore(await file.text());}catch{setStatus("Could not read this project file.");}}}/>
        <div className={styles.service}><div><h3>Ready to make it real?</h3><p>Contact True Authentic about your custom order. Keep your original artwork and downloaded project. Pricing, garment options and production details are confirmed before ordering.</p></div><a href="https://www.ta-apparel.com/pages/contact" target="_top">Contact True Authentic ↗</a></div>
        <p className={styles.muted}>Your artwork stays in this browser unless you choose to send it. Downloads do not place an order. Artwork quality still needs review before printing.</p>
      </section>
    </div>
  </div>;
}
