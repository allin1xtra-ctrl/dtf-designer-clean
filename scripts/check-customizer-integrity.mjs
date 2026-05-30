import { readFileSync } from "node:fs";

const target = "app/customizer/page.tsx";
const source = readFileSync(target, "utf8");

const blockers = [
  "<<<<<<<",
  "=======",
  ">>>>>>>",
  '(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<\'EOF\' ',
  "diff --git a/app/customizer/page.tsx b/app/customizer/page.tsx",
];

const failures = blockers.filter((needle) => source.includes(needle));

const addFailure = (message) => {
  failures.push(message);
};

const matchCount = (pattern) => source.match(pattern)?.length ?? 0;

if (!source.startsWith('"use client";')) {
  addFailure('Expected file to start with "use client";');
}

if (source.includes("type SheetSize = {\ntype ParsedSize = {")) {
  addFailure("Found overlapping SheetSize/ParsedSize type declarations.");
}

const snapThresholdCount = matchCount(/const\s+SNAP_TO_CENTER_THRESHOLD\s*=/g);
if (snapThresholdCount !== 1) {
  addFailure(`Expected exactly one SNAP_TO_CENTER_THRESHOLD declaration, found ${snapThresholdCount}.`);
}

if (!/const\s+SNAP_TO_CENTER_THRESHOLD\s*=\s*4;/.test(source)) {
  addFailure("Expected SNAP_TO_CENTER_THRESHOLD to remain at the jitter-safe value of 4.");
}

const defaultControlsMatch = source.match(
  /const\s+DEFAULT_TEXT_CONTROLS:\s*TextControlsState\s*=\s*\{[\s\S]*?\n\};/
);
if (!defaultControlsMatch) {
  addFailure("Could not find DEFAULT_TEXT_CONTROLS block.");
} else if (defaultControlsMatch[0].includes('"Poppins",')) {
  addFailure("Found font-family list entries inside DEFAULT_TEXT_CONTROLS.");
}

const draftPayloadMatch = source.match(/type\s+DraftPayload\s*=\s*\{[\s\S]*?\n\};/);
if (!draftPayloadMatch) {
  addFailure("Could not find DraftPayload type block.");
} else if (draftPayloadMatch[0].includes("});")) {
  addFailure("Found malformed React state closer inside DraftPayload type.");
}

if (!/const\s+handleObjectModified\s*=\s*\(event:\s*ModifiedEvent\)/.test(source)) {
  addFailure("Expected handleObjectModified to keep the Fabric ModifiedEvent type.");
}

if (source.includes("event.target as { setCoords?: () => void } | undefined")) {
  addFailure("Found unsafe event.target setCoords cast in handleObjectModified.");
}

if (failures.length > 0) {
  console.error(`\nBuild guard failed for ${target}.`);
  console.error("Found invalid customizer content:");
  for (const item of failures) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`Integrity check passed: ${target}`);
