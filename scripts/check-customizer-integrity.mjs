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

if (failures.length > 0) {
  console.error(`\nBuild guard failed for ${target}.`);
  console.error("Found invalid merge/patch content:");
  for (const item of failures) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

if (!source.startsWith('"use client";')) {
  console.error(`\nBuild guard failed for ${target}.`);
  console.error('Expected file to start with "use client";');
  process.exit(1);
}

console.log(`Integrity check passed: ${target}`);
