import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOTS = ["app", "lib", "components", "modules", "src", "hooks", "service", "types", "tests"];
const EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "prisma", "public", "backups", "dist", "coverage"]);
const ENUMS = ["OperationalArea", "VisitStatus", "QueueItemStatus", "VisitPriority"];
const PRISMA_MODULE = "@prisma/client";

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
      continue;
    }
    const dot = entry.lastIndexOf(".");
    if (dot === -1) continue;
    const ext = entry.slice(dot);
    if (!EXTENSIONS.has(ext)) continue;
    files.push(full);
  }
  return files;
}

function parseImportNames(list) {
  return list
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^type\s+/, ""))
    .map((part) => part.split(/\s+as\s+/i)[0].trim());
}

function scanFile(file) {
  const text = readFileSync(file, "utf8");
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const typeImports = new Set();
  const valueImports = new Set();

  const importRegex = /import\s+(type\s+)?\{([^}]+)\}\s*from\s*["']@prisma\/client["']/g;
  let match;
  while ((match = importRegex.exec(text))) {
    const typeOnly = Boolean(match[1]);
    const names = parseImportNames(match[2]);
    for (const name of names) {
      if (!ENUMS.includes(name)) continue;
      if (typeOnly) typeImports.add(name);
      else valueImports.add(name);
    }
  }

  // Handle mixed imports: import { OperationalArea, type VisitStatus } from "@prisma/client";
  const mixedImportRegex = /import\s+\{([^}]+)\}\s*from\s*["']@prisma\/client["']/g;
  while ((match = mixedImportRegex.exec(text))) {
    const raw = match[1];
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const isType = part.startsWith("type ");
      const name = part.replace(/^type\s+/, "").split(/\s+as\s+/i)[0].trim();
      if (!ENUMS.includes(name)) continue;
      if (isType) typeImports.add(name);
      else valueImports.add(name);
    }
  }

  const issues = [];

  for (const enumName of ENUMS) {
    const memberUse = new RegExp(`\\b${enumName}\\.`).test(stripped);
    const objectUse = new RegExp(`Object\\.(values|keys|entries)\\(\\s*${enumName}\\s*\\)`).test(stripped);
    const runtimeUse = memberUse || objectUse;

    if (runtimeUse && !valueImports.has(enumName)) {
      if (typeImports.has(enumName)) {
        issues.push(
          `Runtime use of ${enumName} but imported as type-only from ${PRISMA_MODULE}. Use value import.`
        );
      } else {
        issues.push(`Runtime use of ${enumName} without value import from ${PRISMA_MODULE}.`);
      }
    }

    const localEnum = new RegExp(`\\b(enum|const)\\s+${enumName}\\b`).test(stripped);
    if (localEnum) {
      issues.push(`Local runtime enum/const definition detected for ${enumName}. Use Prisma enum.`);
    }
  }

  return issues;
}

const files = ROOTS.flatMap((root) => {
  try {
    return walk(root);
  } catch {
    return [];
  }
});

const problems = [];
for (const file of files) {
  const issues = scanFile(file);
  if (issues.length) {
    problems.push({ file, issues });
  }
}

if (problems.length) {
  console.error("Enum audit failed. Issues found:\n");
  for (const problem of problems) {
    console.error(`- ${problem.file}`);
    for (const issue of problem.issues) {
      console.error(`  - ${issue}`);
    }
  }
  process.exit(1);
}

console.log("Enum audit passed. No runtime/type import mismatches detected.");
