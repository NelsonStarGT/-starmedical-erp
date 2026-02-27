import { ClientProfileType } from "@prisma/client";
import {
  getClientBulkColumns,
  getClientBulkTemplateExampleRow,
  getClientBulkTemplateHeadersDisplay
} from "@/lib/clients/bulk/clientBulkSchema";

type CellStyle = "default" | "header_required" | "header_optional" | "note_header" | "note_text";

type SheetCell = {
  value: string;
  style?: CellStyle;
};

type SheetData = {
  name: string;
  widths?: number[];
  rows: SheetCell[][];
};

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC32_TABLE[(crc ^ buffer[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function excelColumnName(indexOneBased: number) {
  let value = indexOneBased;
  let name = "";
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createZip(entriesInput: Array<{ name: string; data: Buffer | string }>) {
  const entries = entriesInput.map((entry) => ({
    name: entry.name,
    nameBuffer: Buffer.from(entry.name, "utf8"),
    data: Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8")
  }));

  const now = new Date();
  const dosTime = ((now.getHours() & 0x1f) << 11) | ((now.getMinutes() & 0x3f) << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = (((now.getFullYear() - 1980) & 0x7f) << 9) | (((now.getMonth() + 1) & 0x0f) << 5) | (now.getDate() & 0x1f);

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression = store
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(entry.nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length

    localParts.push(localHeader, entry.nameBuffer, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // compression
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(entry.nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk start
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, entry.nameBuffer);
    offset += localHeader.length + entry.nameBuffer.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const centralOffset = offset;

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // current disk
  end.writeUInt16LE(0, 6); // start disk
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function styleIndex(style?: CellStyle) {
  if (style === "header_required") return 1;
  if (style === "header_optional") return 2;
  if (style === "note_header") return 3;
  if (style === "note_text") return 4;
  return 0;
}

function buildSheetXml(
  sheet: SheetData,
  getSharedStringIndex: (value: string) => number
) {
  const colsXml =
    sheet.widths && sheet.widths.length
      ? `<cols>${sheet.widths
          .map(
            (width, idx) =>
              `<col min="${idx + 1}" max="${idx + 1}" width="${Math.max(8, Math.min(80, width))}" customWidth="1"/>`
          )
          .join("")}</cols>`
      : "";

  const rowsXml = sheet.rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cellsXml = row
        .map((cell, colIndex) => {
          const cellRef = `${excelColumnName(colIndex + 1)}${rowNumber}`;
          const sharedIndex = getSharedStringIndex(cell.value ?? "");
          const s = styleIndex(cell.style);
          return `<c r="${cellRef}" t="s" s="${s}"><v>${sharedIndex}</v></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cellsXml}</row>`;
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
    `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`,
    `<sheetFormatPr defaultRowHeight="15"/>`,
    colsXml,
    `<sheetData>${rowsXml}</sheetData>`,
    `</worksheet>`
  ].join("");
}

function buildStylesXml() {
  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`,
    `<fonts count="3">`,
    `<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>`,
    `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>`,
    `<font><b/><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>`,
    `</fonts>`,
    `<fills count="5">`,
    `<fill><patternFill patternType="none"/></fill>`,
    `<fill><patternFill patternType="gray125"/></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="FFDC2626"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>`,
    `</fills>`,
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>`,
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`,
    `<cellXfs count="5">`,
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`,
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`,
    `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`,
    `<xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>`,
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>`,
    `</cellXfs>`,
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`,
    `</styleSheet>`
  ].join("");
}

function buildSharedStringsXml(strings: string[]) {
  const items = strings
    .map((value) => {
      const escaped = escapeXml(value);
      return `<si><t${/^\s|\s$/.test(value) ? ' xml:space="preserve"' : ""}>${escaped}</t></si>`;
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`,
    items,
    `</sst>`
  ].join("");
}

function typeLabel(type: ClientProfileType) {
  if (type === ClientProfileType.PERSON) return "Personas";
  if (type === ClientProfileType.COMPANY) return "Empresas";
  if (type === ClientProfileType.INSTITUTION) return "Instituciones";
  return "Aseguradoras";
}

function parserLabel(parser: string) {
  if (parser === "email") return "Email valido";
  if (parser === "phone") return "Telefono (acepta + y digitos)";
  if (parser === "date") return "Fecha ISO (YYYY-MM-DD)";
  if (parser === "boolean") return "Booleano (true/false, si/no)";
  if (parser === "list") return "Lista separada por coma";
  return "Texto";
}

export function buildClientBulkTemplateWorkbook(type: ClientProfileType) {
  const schemaColumns = getClientBulkColumns(type);
  const headers = getClientBulkTemplateHeadersDisplay(type);
  const example = getClientBulkTemplateExampleRow(type);

  const templateSheet: SheetData = {
    name: "Plantilla",
    widths: headers.map((header) => Math.max(14, Math.min(40, header.length + 4))),
    rows: [
      headers.map((header, idx) => ({
        value: header,
        style: schemaColumns[idx]?.required ? "header_required" : "header_optional"
      })),
      example.map((value) => ({ value, style: "default" }))
    ]
  };

  const notesRows: SheetCell[][] = [
    [{ value: `Plantilla de carga masiva (${typeLabel(type)})`, style: "note_header" }],
    [{ value: "1) Respeta exactamente los encabezados de la hoja Plantilla.", style: "note_text" }],
    [{ value: "2) Campos requeridos aparecen con * y encabezado rojo.", style: "note_text" }],
    [{ value: "3) Fechas en formato YYYY-MM-DD. Listas separadas por coma.", style: "note_text" }],
    [{ value: "4) Puedes dejar vacio cualquier campo no requerido.", style: "note_text" }],
    [{ value: "", style: "default" }],
    [
      { value: "Columna", style: "note_header" },
      { value: "Requerido", style: "note_header" },
      { value: "Formato", style: "note_header" },
      { value: "Destino", style: "note_header" }
    ],
    ...schemaColumns.map((columnDef) => [
      { value: `${columnDef.headerDisplay}${columnDef.required ? "*" : ""}`, style: "note_text" as const },
      { value: columnDef.required ? "SI" : "NO", style: "note_text" as const },
      { value: parserLabel(columnDef.parser), style: "note_text" as const },
      { value: columnDef.target, style: "note_text" as const }
    ])
  ];

  const notesSheet: SheetData = {
    name: "Notas",
    widths: [34, 14, 30, 44],
    rows: notesRows
  };

  const sheets = [templateSheet, notesSheet];

  const sharedStrings: string[] = [];
  const stringIndexMap = new Map<string, number>();
  const getSharedStringIndex = (value: string) => {
    const key = value ?? "";
    const existing = stringIndexMap.get(key);
    if (typeof existing === "number") return existing;
    const idx = sharedStrings.length;
    sharedStrings.push(key);
    stringIndexMap.set(key, idx);
    return idx;
  };

  const worksheetXmlList = sheets.map((sheet) => buildSheetXml(sheet, getSharedStringIndex));
  const sharedStringsXml = buildSharedStringsXml(sharedStrings);
  const stylesXml = buildStylesXml();

  const workbookXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`,
    `<sheets>`,
    `<sheet name="Plantilla" sheetId="1" r:id="rId1"/>`,
    `<sheet name="Notas" sheetId="2" r:id="rId2"/>`,
    `</sheets>`,
    `</workbook>`
  ].join("");

  const workbookRelsXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`,
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>`,
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
    `<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>`,
    `</Relationships>`
  ].join("");

  const rootRelsXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`,
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`,
    `</Relationships>`
  ].join("");

  const contentTypesXml = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`,
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`,
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`,
    `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`,
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    `</Types>`
  ].join("");

  return createZip([
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: rootRelsXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRelsXml },
    { name: "xl/styles.xml", data: stylesXml },
    { name: "xl/sharedStrings.xml", data: sharedStringsXml },
    { name: "xl/worksheets/sheet1.xml", data: worksheetXmlList[0]! },
    { name: "xl/worksheets/sheet2.xml", data: worksheetXmlList[1]! }
  ]);
}
