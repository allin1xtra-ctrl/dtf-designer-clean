import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile('docs/premium-mockup-replacement-manifest.json', 'utf8'));

test('every required product/color/view has one decodable transparent optimized asset', async () => {
  assert.equal(manifest.tasks.length, manifest.plannedAssets);
  const ready = manifest.tasks.filter(task => task.status === "generated");
  assert.equal(ready.length, 75);
  assert.equal(ready.length, manifest.requiredAssets);
  assert.equal(new Set(manifest.tasks.map(t => t.targetPath)).size, 126);
  const produced = manifest.tasks.filter(task => ["generated", "rejected-visual-qa"].includes(task.status));
  assert.equal(produced.length, 80);
  for (const task of produced) {
    const file = 'public' + task.targetPath;
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.format, 'webp', file);
    assert.ok(metadata.width >= 1000 && metadata.height >= 1000, file);
    assert.ok(metadata.hasAlpha, file);
    assert.equal(task.hasBakedPrintGuide, false, file);
    assert.ok((await stat(file)).size < 1000000, file);
  }
});

test('all original mockups remain unchanged and available for rollback', async () => {
  assert.equal(manifest.originals.length, 36);
  for (const original of manifest.originals) {
    const bytes = await readFile('public/customizer-preview/mockups/' + original.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), original.sha256, original.file);
  }
});

function functionText(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  let depth = 0, entered = false;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') { depth++; entered = true; }
    if (source[i] === '}' && --depth === 0 && entered) return source.slice(start, i + 1).replace(/\r\n/g, '\n');
  }
  throw new Error('Unterminated ' + name);
}

test('asset integration preserves artwork scale, boundaries and placement algorithms', async () => {
  const file = 'components/customizer-preview/CustomizerPrototype.tsx';
  const before = execFileSync('git', ['show', 'bdc2c65:' + file], { encoding: 'utf8' });
  const after = await readFile(file, 'utf8');
  for (const name of ['getDefaultPrintAreaForView', 'getFrontAlignedPrintArea', 'getSafePrintArea', 'getPrintAreaStyle', 'getLayerAspectRatio', 'getProportionalFitSize', 'getProportionalScaleSize'])
    assert.equal(functionText(after, name), functionText(before, name), name);
  const css = 'components/true-authentic/designer.module.css';
  const currentCss = (await readFile(css, 'utf8')).replace(/\r\n/g, '\n');
  const baselineCss = execFileSync('git', ['show', 'bdc2c65:' + css], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  // The user approved a larger/lower shirt box and invisible canvas borders.
  const approvedCss = baselineCss.replace('overflow:hidden;border:1px solid #70786d', 'overflow:hidden;border:0').replace('top:27%;left:34%;width:32%;max-height:53%;background:none;border:1px dashed #e8ba85', 'top:22.4%;left:27%;width:46%;max-height:63.6%;background:none;border:0');
  assert.equal(currentCss, approvedCss);
});
