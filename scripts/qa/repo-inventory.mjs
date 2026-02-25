#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const docsRepoDir = path.join(root, "docs", "repo");

function run(cmd) {
  return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function rel(absPath) {
  return toPosix(path.relative(root, absPath));
}

function read(file) {
  try {
    return fs.readFileSync(path.join(root, file), "utf8");
  } catch {
    return "";
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) {
    base = path.join(root, spec.slice(2));
  } else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = path.resolve(path.dirname(path.join(root, fromFile)), spec);
  } else {
    return null;
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return rel(candidate);
    }
  }

  return null;
}

function collectImports(file, content) {
  const imports = [];
  const patterns = [
    /(?:import|export)\s+(?:[^"'`]+\s+from\s+)?["']([^"']+)["']/g,
    /import\(["']([^"']+)["']\)/g,
    /require\(["']([^"']+)["']\)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const spec = String(match[1] || "").trim();
      if (!spec) continue;
      const resolved = resolveImport(file, spec);
      if (resolved) imports.push(resolved);
    }
  }

  return imports;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

const trackedFiles = run("git ls-files")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

ensureDir(docsRepoDir);
fs.writeFileSync(path.join(docsRepoDir, "file-manifest.txt"), `${trackedFiles.join("\n")}\n`, "utf8");

const codeFilePattern = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const codeFiles = trackedFiles.filter((file) => codeFilePattern.test(file));

const incomingRefs = new Map();
for (const file of codeFiles) incomingRefs.set(file, 0);

for (const file of codeFiles) {
  const content = read(file);
  const resolvedImports = collectImports(file, content);
  for (const dep of resolvedImports) {
    if (incomingRefs.has(dep)) {
      incomingRefs.set(dep, (incomingRefs.get(dep) || 0) + 1);
    }
  }
}

const unusedCandidates = trackedFiles.filter((file) => {
  if (!codeFilePattern.test(file)) return false;
  if (!/^components\//.test(file) && !/^lib\//.test(file) && !/^hooks\//.test(file)) return false;
  if (/\.d\.ts$/.test(file)) return false;
  if (/\.(test|spec)\.[jt]sx?$/.test(file)) return false;
  if (/\/index\.[jt]sx?$/.test(file)) return false;
  if (/\.stories\.[jt]sx?$/.test(file)) return false;
  if (/\/__tests__\//.test(file)) return false;
  return true;
});

const unusedFiles = uniqueSorted(
  unusedCandidates.filter((file) => (incomingRefs.get(file) || 0) === 0)
);

fs.writeFileSync(
  path.join(docsRepoDir, "inventory-unused-files.txt"),
  unusedFiles.length ? `${unusedFiles.join("\n")}\n` : "(none)\n",
  "utf8"
);

const componentFiles = trackedFiles.filter((file) => /^components\/.+\.[jt]sx?$/.test(file));
const hashGroups = new Map();
for (const file of componentFiles) {
  const content = read(file);
  const hash = crypto.createHash("sha1").update(content).digest("hex");
  const existing = hashGroups.get(hash) || [];
  existing.push(file);
  hashGroups.set(hash, existing);
}

const duplicateGroups = Array.from(hashGroups.entries())
  .map(([hash, files]) => ({ hash, files: files.sort((a, b) => a.localeCompare(b)) }))
  .filter((group) => group.files.length > 1)
  .sort((a, b) => b.files.length - a.files.length || a.hash.localeCompare(b.hash));

const duplicateLines = [];
for (const group of duplicateGroups) {
  duplicateLines.push(`# sha1=${group.hash} count=${group.files.length}`);
  duplicateLines.push(...group.files);
  duplicateLines.push("");
}

fs.writeFileSync(
  path.join(docsRepoDir, "inventory-duplicate-components.txt"),
  duplicateLines.length ? `${duplicateLines.join("\n").trimEnd()}\n` : "(none)\n",
  "utf8"
);

const localLayouts = trackedFiles
  .filter((file) => /^app\/.+\/layout\.tsx$/.test(file))
  .filter((file) => file !== "app/layout.tsx")
  .sort((a, b) => a.localeCompare(b));

fs.writeFileSync(
  path.join(docsRepoDir, "inventory-local-layouts.txt"),
  localLayouts.length ? `${localLayouts.join("\n")}\n` : "(none)\n",
  "utf8"
);

const runtimeEntryFiles = trackedFiles.filter((file) =>
  /^app\/.+\/(page|layout|route)\.[jt]sx?$/.test(file)
);

const runtimeMockFindings = [];
for (const file of runtimeEntryFiles) {
  const content = read(file);
  const lines = content.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!/(mock|stub|fixture|faker)/i.test(line)) continue;
    runtimeMockFindings.push(`${file}:${idx + 1}: ${line.trim()}`);
  }
}

fs.writeFileSync(
  path.join(docsRepoDir, "inventory-runtime-mocks.txt"),
  runtimeMockFindings.length ? `${runtimeMockFindings.join("\n")}\n` : "(none)\n",
  "utf8"
);

const allowedBrandHex = new Set(["#4aa59c", "#4aadf5", "#2e75ba", "#ffffff", "#f8fafc"]);
const allowedSemanticHex = new Set([
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
]);
const allowedAllHex = new Set([...allowedBrandHex, ...allowedSemanticHex]);

const tokenScanTargets = trackedFiles.filter((file) => {
  if (!/^app\//.test(file) && !/^components\//.test(file) && !/^lib\//.test(file)) return false;
  if (!/\.(css|ts|tsx|js|jsx|mjs)$/.test(file)) return false;
  if (/\.(test|spec)\.[jt]sx?$/.test(file)) return false;
  if (/\/__tests__\//.test(file)) return false;
  return true;
});

const hexRegex = /#[0-9a-fA-F]{6}\b/g;
const hexViolations = [];
const hexUsageCount = new Map();
for (const file of tokenScanTargets) {
  const content = read(file);
  const lines = content.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const matches = line.match(hexRegex) || [];
    for (const rawHex of matches) {
      const hex = rawHex.toLowerCase();
      hexUsageCount.set(hex, (hexUsageCount.get(hex) || 0) + 1);
      if (allowedAllHex.has(hex)) continue;
      hexViolations.push(`${file}:${idx + 1}: ${rawHex}`);
    }
  }
}

fs.writeFileSync(
  path.join(docsRepoDir, "inventory-brand-hex-violations.txt"),
  hexViolations.length ? `${hexViolations.join("\n")}\n` : "(none)\n",
  "utf8"
);

const topHex = Array.from(hexUsageCount.entries())
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 25)
  .map(([hex, count]) => `- ${hex}: ${count}`)
  .join("\n");

const summary = [
  "# Repo Inventory Report",
  "",
  `- Generated: ${new Date().toISOString()}`,
  `- Total tracked files: ${trackedFiles.length}`,
  `- Code files analyzed: ${codeFiles.length}`,
  `- Potentially unused files (heuristic): ${unusedFiles.length}`,
  `- Duplicate component groups (exact hash): ${duplicateGroups.length}`,
  `- Local layouts detected: ${localLayouts.length}`,
  `- Runtime files referencing mock/stub/faker: ${runtimeMockFindings.length}`,
  `- Brand token HEX violations: ${hexViolations.length}`,
  "",
  "## Outputs",
  "",
  "- docs/repo/file-manifest.txt",
  "- docs/repo/inventory-unused-files.txt",
  "- docs/repo/inventory-duplicate-components.txt",
  "- docs/repo/inventory-local-layouts.txt",
  "- docs/repo/inventory-runtime-mocks.txt",
  "- docs/repo/inventory-brand-hex-violations.txt",
  "",
  "## Top HEX usage (all values)",
  "",
  topHex || "- (none)",
  "",
  "## Notes",
  "",
  "- Potentially unused list is static-analysis heuristic and may include dynamic imports.",
  "- Runtime mock list includes fallback/stub references in page/layout/route files and should be triaged by module.",
  "- HEX violations are compared against brand + semantic allowlist only."
].join("\n");

fs.writeFileSync(path.join(docsRepoDir, "repo-inventory-report.md"), `${summary}\n`, "utf8");

console.log(`[repo-inventory] manifest=${trackedFiles.length} unused=${unusedFiles.length} dupGroups=${duplicateGroups.length} layouts=${localLayouts.length} runtimeMocks=${runtimeMockFindings.length} hexViolations=${hexViolations.length}`);
