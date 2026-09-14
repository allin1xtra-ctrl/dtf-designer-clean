import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const modelUrl = compile(readFileSync(new URL('../components/true-authentic/design-model.ts', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../components/true-authentic/apparel-model.ts', import.meta.url), 'utf8').replace('"./design-model"', JSON.stringify(modelUrl));
const { emptyProject, parseProject, changeGarment, apparelCatalog, FALLBACK_CATALOG, VIEWS, mockupUrl } = await import(compile(source));
const text = { id: 'text', type: 'text', name: 'Text', text: 'TRUE', font: 'Arial', color: '#ffffff', x: 50, y: 50, width: 60, height: 15, rotation: 0 };
test('all five print areas save independently and round-trip', () => {
  const project = emptyProject();
  VIEWS.forEach(view => project.views[view].layers.push({ ...text, text: view }));
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  assert.equal(new Set(VIEWS.map(v => project.views[v].layers[0].text)).size, 5);
});
test('old projects migrate to front without copying to other sides', () => {
  const project = parseProject(JSON.stringify({ ...emptyProject().views.front, layers: [text] }));
  assert.equal(project.views.front.layers.length, 1);
  assert.equal(project.views.back.layers.length, 0);
});
test('rejects an incomplete or malicious multi-view project', () => {
  const project = emptyProject(); delete project.views.neckTag;
  assert.throws(() => parseProject(JSON.stringify(project)));
  const invalid = emptyProject(); invalid.views.back.layers = [{ ...text, type: 'image', source: 'javascript:alert(1)' }];
  assert.throws(() => parseProject(JSON.stringify(invalid)));
});
test('changing garment uses admin dimensions without stretching artwork', () => {
  const project = emptyProject(); project.views.front.layers = [text];
  const variant = { ...FALLBACK_CATALOG.variants[0], id: 'admin-test', printAreas: { front: { x: 50, y: 50, width: 40, height: 50, widthInches: 10, heightInches: 12 } } };
  const next = changeGarment(project, variant);
  assert.equal(next.views.front.width, 10); assert.equal(next.views.front.height, 12);
  const layer = next.views.front.layers[0];
  assert.equal(layer.width * 10, text.width * 12);
  assert.equal(layer.height * 12, text.height * 16);
  assert.deepEqual(parseProject(JSON.stringify(next)), next);
  assert.equal(project.views.front.width, 12);
});
test('catalog excludes inactive garments and transfer sheets', () => {
  const base = FALLBACK_CATALOG.products[0];
  const catalog = apparelCatalog({ products: [base, { ...base, id: 'transfer', type: 'transfer', name: 'Transfer sheets' }], variants: [FALLBACK_CATALOG.variants[0], { ...FALLBACK_CATALOG.variants[1], productId: 'transfer' }] });
  assert.equal(catalog.products.length, 1); assert.equal(catalog.variants.length, 1);
  VIEWS.forEach(view => assert.ok(mockupUrl(catalog.variants[0], view)));
});
