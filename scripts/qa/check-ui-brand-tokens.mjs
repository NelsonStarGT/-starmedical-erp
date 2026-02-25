#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const baselinePath = path.join(root, "docs", "repo", "ui-token-hex-baseline.json");
const updateBaseline = process.argv.includes("--update-baseline");

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function readFile(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

const allowedBrandHex = ["#4aa59c", "#4aadf5", "#2e75ba", "#ffffff", "#f8fafc"];
const allowedSemanticHex = [
  "#16a34a",
  "#22c55e",
  "#15803d",
  "#4ade80",
  "#d97706",
  "#f59e0b",
  "#fbbf24",
  "#b45309",
  "#dc2626",
  "#ef4444",
  "#f87171",
  "#b91c1c"
];
const allowedHexSet = new Set([...allowedBrandHex, ...allowedSemanticHex]);

const trackedFiles = run("git ls-files")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const targets = trackedFiles.filter((file) => {
  if (!/^app\//.test(file) && !/^components\//.test(file) && !/^lib\//.test(file) && file !== "app/globals.css") return false;
  if (!/\.(css|ts|tsx|js|jsx|mjs)$/.test(file)) return false;
  if (/\.(test|spec)\.[jt]sx?$/.test(file)) return false;
  if (/\/__tests__\//.test(file)) return false;
  return true;
});

const hexRegex = /#[0-9a-fA-F]{6}\b/g;
const allViolationsRaw = [];
for (const file of targets) {
  const content = readFile(file);
  const lines = content.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const matches = lines[idx].match(hexRegex) || [];
    for (const match of matches) {
      const normalized = match.toLowerCase();
      if (allowedHexSet.has(normalized)) continue;
      allViolationsRaw.push(`${file}:${idx + 1}:${normalized}`);
    }
  }
}

const allViolations = Array.from(new Set(allViolationsRaw)).sort((a, b) => a.localeCompare(b));

if (updateBaseline) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        allowedBrandHex,
        allowedSemanticHex,
        violations: allViolations
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`[ui-token-check] baseline updated with ${allViolations.length} known violations.`);
  process.exit(0);
}

if (!fs.existsSync(baselinePath)) {
  console.error("[ui-token-check] baseline not found. Run: node scripts/qa/check-ui-brand-tokens.mjs --update-baseline");
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const baselineSet = new Set(Array.isArray(baseline.violations) ? baseline.violations : []);
const newViolations = allViolations.filter((item) => !baselineSet.has(item));

if (newViolations.length > 0) {
  console.error(`[ui-token-check] new violations detected: ${newViolations.length}`);
  for (const violation of newViolations.slice(0, 200)) {
    console.error(`  - ${violation}`);
  }
  if (newViolations.length > 200) {
    console.error(`  ... and ${newViolations.length - 200} more`);
  }
  process.exit(1);
}

console.log(
  `[ui-token-check] OK. Current violations=${allViolations.length} (baseline=${baselineSet.size}), new=0.`
);
