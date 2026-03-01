import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

test("ClientRowActions renderiza menú de acciones en portal overlay", () => {
  const filePath = path.join(process.cwd(), "components/clients/ClientRowActions.tsx");
  const source = readFileSync(filePath, "utf8");

  assert.match(source, /createPortal\(/);
  assert.match(source, /CLIENT_ROW_ACTIONS_MENU_PORTAL_ATTR/);
  assert.match(source, /position:\s*\"fixed\"/);
});

