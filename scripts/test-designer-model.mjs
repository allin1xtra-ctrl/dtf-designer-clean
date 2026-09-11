import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_DESIGN, parseDesign, layerWarnings } from "../components/true-authentic/design-model.ts";

const text = { id: "one", type: "text", name: "Text", text: "TRUE", font: "Arial", color: "#111111", x: 50, y: 50, width: 60, height: 15, rotation: 0 };
test("saved projects preserve all text placement and dimensions", () => {
  const value = { ...EMPTY_DESIGN, layers: [text] };
  assert.deepEqual(parseDesign(JSON.stringify(value)), value);
});
test("rejects remote and executable image sources", () => {
  for (const source of ["https://example.com/a.png", "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zz4="])
    assert.throws(() => parseDesign(JSON.stringify({...EMPTY_DESIGN,layers:[{...text,type:"image",source,pixelsWide:1000}]})));
});
test("rejects invalid dimensions, duplicate layers and excessive layers", () => {
  assert.throws(() => parseDesign(JSON.stringify({...EMPTY_DESIGN,width:200})));
  assert.throws(() => parseDesign(JSON.stringify({...EMPTY_DESIGN,layers:[text,text]})));
  assert.throws(() => parseDesign(JSON.stringify({...EMPTY_DESIGN,layers:Array(21).fill(text)})));
});
test("flags rotated clipping and low resolution at actual print size", () => {
  const image = {...text,type:"image",width:90,height:90,rotation:45,pixelsWide:500};
  const issues=layerWarnings({...EMPTY_DESIGN,layers:[image]});
  assert.equal(issues.length,2);
  assert.match(issues[0], /cropped/); assert.match(issues[1], /low image resolution/);
});
test("centered high resolution images do not show false warnings", () => {
  assert.deepEqual(layerWarnings({...EMPTY_DESIGN,layers:[{...text,type:"image",pixelsWide:3600}]}),[]);
});
