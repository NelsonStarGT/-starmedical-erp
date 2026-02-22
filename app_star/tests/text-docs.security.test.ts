import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeTextDocHtml } from "@/lib/text-docs/sanitizeHtml";
import { detectImageMime, validateTextDocUpload } from "@/lib/text-docs/upload";

const pngFixture = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
const jpegFixture = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x84, 0x00, 0x01]);

test("detectImageMime identifica PNG y JPEG por magic bytes", () => {
  assert.equal(detectImageMime(pngFixture), "image/png");
  assert.equal(detectImageMime(jpegFixture), "image/jpeg");
});

test("validateTextDocUpload rechaza mismatch entre MIME reportado y bytes reales", () => {
  const result = validateTextDocUpload(pngFixture, "image/jpeg");
  assert.equal(result.ok, false);
  assert.equal(result.error, "MIME_MISMATCH");
});

test("validateTextDocUpload rechaza bytes no soportados", () => {
  const result = validateTextDocUpload(Buffer.from("no-image"), "image/png");
  assert.equal(result.ok, false);
  assert.equal(result.error, "UNSUPPORTED_TYPE");
});

test("sanitizeTextDocHtml elimina script handlers y javascript: URIs", () => {
  const raw = `
    <p onclick="alert(1)">Hola<script>alert(2)</script></p>
    <a href="javascript:alert(3)">hack</a>
    <img src="javascript:alert(4)" onerror="alert(5)" />
  `;
  const safe = sanitizeTextDocHtml(raw);
  assert.equal(/script/i.test(safe), false);
  assert.equal(/onclick=/i.test(safe), false);
  assert.equal(/onerror=/i.test(safe), false);
  assert.equal(/javascript:/i.test(safe), false);
});

test("sanitizeTextDocHtml conserva etiquetas válidas y normaliza enlaces seguros", () => {
  const raw = `<p data-indent="18" style="margin-left:18px;color:#2e75ba">ok</p><a href="https://starmedical.com">sitio</a>`;
  const safe = sanitizeTextDocHtml(raw);
  assert.equal(safe.includes("<p"), true);
  assert.equal(safe.includes("data-indent=\"18\""), true);
  assert.equal(safe.includes("href=\"https://starmedical.com\""), true);
  assert.equal(safe.includes("rel=\"noopener noreferrer\""), true);
});

