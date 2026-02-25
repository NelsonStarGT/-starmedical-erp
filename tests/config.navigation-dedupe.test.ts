import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const CONFIG_ROOT = path.join(process.cwd(), "app", "admin", "configuracion");

function collectPageFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPageFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name !== "page.tsx") continue;
    files.push(fullPath);
  }
  return files;
}

test("config module nav is rendered once from module layout", () => {
  const layoutPath = path.join(CONFIG_ROOT, "layout.tsx");
  assert.equal(statSync(layoutPath).isFile(), true);

  const layoutSource = readFileSync(layoutPath, "utf8");
  assert.match(layoutSource, /ConfigSectionNav/);

  const pageFiles = collectPageFiles(CONFIG_ROOT);
  assert.ok(pageFiles.length > 0, "no config page files found");

  for (const pagePath of pageFiles) {
    const source = readFileSync(pagePath, "utf8");
    assert.doesNotMatch(source, /ConfigSectionNav/, `duplicate nav render found in ${pagePath}`);
  }
});
