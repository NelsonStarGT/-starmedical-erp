import crypto from "node:crypto";
import ExcelJS from "exceljs";
import Docxtemplater from "docxtemplater";
import { chromium } from "playwright";
import PizZip from "pizzip";
import sharp from "sharp";
import { assertFileSize, assertRowsCols, withTimeout } from "./limits.js";
const DOCX_TEMPLATE_MAX_BYTES = 2 * 1024 * 1024;
const DOCX_MAX_FIELDS = 500;
const DOCX_MAX_DEPTH = 8;
const DOCX_MAX_ARRAY_ITEMS = 200;
const DOCX_MAX_PLACEHOLDERS = 400;
const DOCX_MAX_LOOP_TAGS = 80;
function safeSegment(value) {
    return String(value || "")
        .trim()
        .replace(/[^A-Za-z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120) || "file";
}
function buildJobPrefix(job, at = new Date()) {
    const yyyy = String(at.getUTCFullYear());
    const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(at.getUTCDate()).padStart(2, "0");
    return `tenants/${safeSegment(job.tenantId)}/processing/${safeSegment(job.jobType)}/${yyyy}/${mm}/${dd}/${safeSegment(job.jobId)}`;
}
function buildArtifactKey(job, fileName, bucket = "output") {
    return `${buildJobPrefix(job)}/${bucket}/${safeSegment(fileName)}`;
}
function looksLikeBase64Param(key, value) {
    if (typeof value !== "string" || value.length < 8)
        return false;
    const lower = String(key || "").toLowerCase();
    return lower.includes("base64") || lower.includes("file");
}
function summarizeInputs(params) {
    if (!params || typeof params !== "object" || Array.isArray(params))
        return [];
    const rows = [];
    for (const [key, value] of Object.entries(params)) {
        if (looksLikeBase64Param(key, value)) {
            try {
                const bytes = Buffer.from(value, "base64");
                rows.push({
                    key,
                    type: "base64",
                    bytes: bytes.byteLength,
                    sha256: crypto.createHash("sha256").update(bytes).digest("hex")
                });
                continue;
            }
            catch {
            }
        }
        if (Array.isArray(value)) {
            rows.push({ key, type: "array", length: value.length });
            continue;
        }
        if (value && typeof value === "object") {
            rows.push({ key, type: "object", keys: Object.keys(value).length });
            continue;
        }
        const primitive = value === null || value === undefined ? "" : String(value);
        rows.push({ key, type: typeof value, value: primitive.slice(0, 240) });
    }
    return rows;
}
async function appendManifest(job, deps, artifacts, result) {
    const manifest = {
        manifestVersion: 1,
        jobId: job.jobId,
        tenantId: job.tenantId,
        jobType: job.jobType,
        requestedByUserId: job.actorId,
        generatedAt: new Date().toISOString(),
        storagePrefix: buildJobPrefix(job),
        limitsApplied: job.limits,
        inputs: summarizeInputs(job.params),
        outputs: artifacts.map((artifact) => ({
            key: artifact.key,
            provider: artifact.provider,
            mime: artifact.mime,
            size: artifact.size,
            checksum: artifact.checksum
        })),
        resultSummary: result && typeof result === "object" ? result : {}
    };
    const body = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
    const manifestArtifact = await deps.storage.putObject({
        key: buildArtifactKey(job, "manifest.json", "logs"),
        body,
        contentType: "application/json"
    });
    return {
        ...result,
        manifestKey: manifestArtifact.key
    };
}
function parseBase64(input) {
    if (typeof input !== "string" || input.length < 8) {
        throw new Error("invalid_base64_input");
    }
    return Buffer.from(input, "base64");
}
async function handleExcelExport(job, deps) {
    const sheets = Array.isArray(job.params.sheets) ? job.params.sheets : [];
    if (!sheets.length)
        throw new Error("missing_sheets");
    const workbook = new ExcelJS.Workbook();
    let maxCols = 0;
    let totalRows = 0;
    for (const source of sheets) {
        const sheetName = String(source.name || "Sheet1").slice(0, 31);
        const headers = Array.isArray(source.headers) ? source.headers.map((value) => String(value || "")) : [];
        const rows = Array.isArray(source.rows) ? source.rows : [];
        assertRowsCols({ rows: rows.length, cols: headers.length }, { maxRows: job.limits.maxRows, maxCols: job.limits.maxCols });
        const worksheet = workbook.addWorksheet(sheetName);
        if (headers.length)
            worksheet.addRow(headers);
        for (const row of rows) {
            const values = Array.isArray(row) ? row.slice(0, job.limits.maxCols) : [];
            worksheet.addRow(values);
        }
        maxCols = Math.max(maxCols, headers.length);
        totalRows += rows.length;
    }
    const bufferLike = await withTimeout(workbook.xlsx.writeBuffer(), job.limits.timeoutMs, "excel_export_timeout");
    const buffer = Buffer.isBuffer(bufferLike) ? bufferLike : Buffer.from(bufferLike);
    assertFileSize(buffer, job.limits.maxFileMb);
    const fileName = typeof job.params.fileName === "string" ? job.params.fileName : "export.xlsx";
    const artifact = await deps.storage.putObject({
        key: buildArtifactKey(job, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`),
        body: buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    return {
        artifacts: [artifact],
        result: {
            rows: totalRows,
            cols: maxCols
        }
    };
}
function getCellValue(row, col) {
    return String(row.getCell(col).value ?? "").trim();
}
async function handleExcelImport(job, deps) {
    const inputBase64 = job.params.inputBase64;
    const data = parseBase64(inputBase64);
    assertFileSize(data, job.limits.maxFileMb);
    const workbook = new ExcelJS.Workbook();
    await withTimeout(workbook.xlsx.load(data), job.limits.timeoutMs, "excel_import_timeout");
    const template = String(job.params.template || "generic").toLowerCase();
    if (template === "clientes_v1") {
        const empresasSheet = workbook.getWorksheet("EMPRESAS_INSTITUCIONES");
        const personasSheet = workbook.getWorksheet("PERSONAS_PACIENTES");
        if (empresasSheet) {
            assertRowsCols({ rows: Math.max(0, (empresasSheet.actualRowCount || 0) - 1), cols: empresasSheet.actualColumnCount || 0 }, { maxRows: job.limits.maxRows, maxCols: job.limits.maxCols });
        }
        if (personasSheet) {
            assertRowsCols({ rows: Math.max(0, (personasSheet.actualRowCount || 0) - 1), cols: personasSheet.actualColumnCount || 0 }, { maxRows: job.limits.maxRows, maxCols: job.limits.maxCols });
        }
        const empresas = empresasSheet
            ? readSheetRows(empresasSheet, [
                "tipo_cliente",
                "nit_empresa",
                "codigo_empresa",
                "nombre_comercial",
                "razon_social",
                "sector",
                "estado_cliente",
                "email_corporativo",
                "telefono_corporativo",
                "ciudad",
                "departamento",
                "pais",
                "direccion_fiscal",
                "direccion_comercial"
            ])
            : [];
        const personas = personasSheet
            ? readSheetRows(personasSheet, [
                "tipo_cliente",
                "dpi_persona",
                "dpi_tutor",
                "primer_nombre",
                "segundo_nombre",
                "tercer_nombre",
                "primer_apellido",
                "segundo_apellido",
                "apellido_casada",
                "fecha_nacimiento",
                "sexo",
                "celular",
                "telefono",
                "email",
                "estado_civil",
                "ocupacion",
                "lugar_trabajo",
                "nacionalidad",
                "nit_empresa",
                "codigo_empresa",
                "tipo_relacion"
            ])
            : [];
        const result = { empresas, personas };
        const resultBuffer = Buffer.from(JSON.stringify(result), "utf8");
        const artifact = await deps.storage.putObject({
            key: buildArtifactKey(job, "result.json"),
            body: resultBuffer,
            contentType: "application/json"
        });
        return {
            artifacts: [artifact],
            result: {
                empresas,
                personas
            }
        };
    }
    const ws = workbook.worksheets[0];
    if (!ws)
        throw new Error("empty_workbook");
    assertRowsCols({
        rows: Math.max(0, (ws.actualRowCount || 0) - 1),
        cols: ws.actualColumnCount || 0
    }, { maxRows: job.limits.maxRows, maxCols: job.limits.maxCols });
    const headerValues = ws.getRow(1).values;
    const columns = headerValues.slice(1).map((value) => String(value || ""));
    const rows = [];
    ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1)
            return;
        const entry = {};
        for (let i = 0; i < columns.length; i += 1) {
            const key = columns[i] || `col_${i + 1}`;
            entry[key] = getCellValue(row, i + 1);
        }
        rows.push(entry);
    });
    const result = { columns, rowsCount: rows.length };
    const artifact = await deps.storage.putObject({
        key: buildArtifactKey(job, "rows.json"),
        body: Buffer.from(JSON.stringify({ rows, columns }), "utf8"),
        contentType: "application/json"
    });
    return {
        artifacts: [artifact],
        result
    };
}
function readSheetRows(sheet, headers) {
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1)
            return;
        const raw = {};
        headers.forEach((header, idx) => {
            raw[header] = getCellValue(row, idx + 1);
        });
        rows.push({ index: rowNumber - 1, raw });
    });
    return rows;
}
function countDocxTags(zip) {
    let placeholders = 0;
    let loopTags = 0;
    for (const [fileName, file] of Object.entries(zip.files)) {
        if (!fileName.startsWith("word/") || !fileName.endsWith(".xml"))
            continue;
        const xml = file.asText();
        const tags = xml.match(/\{[^{}]{1,120}\}/g) || [];
        placeholders += tags.length;
        loopTags += tags.filter((tag) => tag.startsWith("{#") || tag.startsWith("{/")).length;
    }
    return { placeholders, loopTags };
}
function normalizeDocxData(value, state, depth = 0) {
    if (depth > DOCX_MAX_DEPTH) {
        throw new Error("docx_data_too_deep");
    }
    if (value === null || value === undefined)
        return "";
    if (typeof value === "string") {
        state.fields += 1;
        if (state.fields > DOCX_MAX_FIELDS)
            throw new Error("docx_data_fields_exceeded");
        return value.length > 4000 ? value.slice(0, 4000) : value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        state.fields += 1;
        if (state.fields > DOCX_MAX_FIELDS)
            throw new Error("docx_data_fields_exceeded");
        return value;
    }
    if (Array.isArray(value)) {
        if (value.length > DOCX_MAX_ARRAY_ITEMS) {
            throw new Error("docx_array_too_large");
        }
        return value.map((item) => normalizeDocxData(item, state, depth + 1));
    }
    if (typeof value !== "object") {
        throw new Error("docx_data_type_not_supported");
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
        throw new Error("docx_data_type_not_supported");
    }
    const output = {};
    for (const [key, item] of Object.entries(value)) {
        if (!/^[A-Za-z0-9_]{1,80}$/.test(key)) {
            throw new Error("docx_data_key_invalid");
        }
        output[key] = normalizeDocxData(item, state, depth + 1);
    }
    return output;
}
async function handleDocxRender(job, deps) {
    const templateKey = String(job.params.templateKey || "").trim();
    if (!templateKey || !templateKey.startsWith("templates/docx/") || !templateKey.endsWith(".docx")) {
        throw new Error("invalid_template_key");
    }
    const template = await deps.storage.getObject(templateKey);
    if (!template) {
        throw new Error("template_not_found");
    }
    if (template.byteLength > DOCX_TEMPLATE_MAX_BYTES) {
        throw new Error("template_too_large");
    }
    const rawData = job.params.data;
    if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
        throw new Error("invalid_docx_data");
    }
    const dataState = { fields: 0 };
    const safeData = normalizeDocxData(rawData, dataState);
    let zip;
    try {
        zip = new PizZip(template);
    }
    catch {
        throw new Error("invalid_docx_template");
    }
    const tags = countDocxTags(zip);
    if (tags.placeholders > DOCX_MAX_PLACEHOLDERS) {
        throw new Error("docx_placeholders_exceeded");
    }
    if (tags.loopTags > DOCX_MAX_LOOP_TAGS) {
        throw new Error("docx_loops_exceeded");
    }
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true
    });
    await withTimeout(Promise.resolve(doc.render(safeData)), job.limits.timeoutMs, "docx_render_timeout");
    const output = await withTimeout(Promise.resolve(doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE"
    })), job.limits.timeoutMs, "docx_render_timeout");
    assertFileSize(output, job.limits.maxFileMb);
    const fileName = typeof job.params.fileName === "string" ? job.params.fileName : "document.docx";
    const artifact = await deps.storage.putObject({
        key: buildArtifactKey(job, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`),
        body: output,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    return {
        artifacts: [artifact],
        result: {
            bytes: output.byteLength,
            fieldsCount: dataState.fields
        }
    };
}
async function handlePdfRender(job, deps) {
    const html = String(job.params.html || "");
    if (!html.trim())
        throw new Error("missing_html");
    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
        const page = await browser.newPage();
        await withTimeout(page.setContent(html, { waitUntil: "networkidle" }), job.limits.timeoutMs, "pdf_render_timeout");
        const pdf = await withTimeout(page.pdf({
            format: String(job.params.format || "A4"),
            printBackground: true
        }), job.limits.timeoutMs, "pdf_render_timeout");
        assertFileSize(pdf, job.limits.maxFileMb);
        const fileName = typeof job.params.fileName === "string" ? job.params.fileName : "document.pdf";
        const artifact = await deps.storage.putObject({
            key: buildArtifactKey(job, fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`),
            body: pdf,
            contentType: "application/pdf"
        });
        return {
            artifacts: [artifact],
            result: {
                bytes: pdf.byteLength
            }
        };
    }
    finally {
        await browser.close();
    }
}
async function handleImageTransform(job, deps) {
    const input = parseBase64(job.params.inputBase64);
    assertFileSize(input, job.limits.maxFileMb);
    const format = String(job.params.format || "jpeg").toLowerCase();
    const width = Number(job.params.width || 0) || undefined;
    const height = Number(job.params.height || 0) || undefined;
    const quality = Number(job.params.quality || 80);
    let pipeline = sharp(input).rotate();
    if (width || height) {
        pipeline = pipeline.resize({ width, height, fit: "inside", withoutEnlargement: true });
    }
    let outputMime = "image/jpeg";
    if (format === "png") {
        pipeline = pipeline.png({ compressionLevel: 9 });
        outputMime = "image/png";
    }
    else if (format === "webp") {
        pipeline = pipeline.webp({ quality });
        outputMime = "image/webp";
    }
    else {
        pipeline = pipeline.jpeg({ quality });
        outputMime = "image/jpeg";
    }
    const output = await withTimeout(pipeline.toBuffer(), job.limits.timeoutMs, "image_transform_timeout");
    assertFileSize(output, job.limits.maxFileMb);
    const ext = outputMime === "image/png" ? "png" : outputMime === "image/webp" ? "webp" : "jpg";
    const fileName = typeof job.params.fileName === "string" ? job.params.fileName : `image.${ext}`;
    const artifact = await deps.storage.putObject({
        key: buildArtifactKey(job, fileName),
        body: output,
        contentType: outputMime
    });
    return {
        artifacts: [artifact],
        result: {
            bytes: output.byteLength,
            format: outputMime
        }
    };
}
export async function executeJob(job, deps) {
    let computed;
    if (job.jobType === "excel_export")
        computed = await handleExcelExport(job, deps);
    else if (job.jobType === "excel_import")
        computed = await handleExcelImport(job, deps);
    else if (job.jobType === "docx_render")
        computed = await handleDocxRender(job, deps);
    else if (job.jobType === "pdf_render")
        computed = await handlePdfRender(job, deps);
    else if (job.jobType === "image_transform")
        computed = await handleImageTransform(job, deps);
    else if (job.jobType === "google_sheets_export" || job.jobType === "drive_upload")
        throw new Error("job_type_not_implemented");
    else
        throw new Error("job_type_not_supported");
    const manifestResult = await appendManifest(job, deps, computed.artifacts, computed.result);
    return {
        artifacts: computed.artifacts,
        result: manifestResult
    };
}
