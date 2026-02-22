import type { MedicalResultDetail, MedicalResultSummary, MedicalResultsBundle } from "./types";

const MOCK_PDF_DATA_URL =
  "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUiBdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMzAwIDE0NF0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDUgMCBSID4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUCi9GMSAyNCBUZgoxMDAgMTAwIFRkCihSZXN1bHRhZG8gZGVtbykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAowMDAwMDAwMjQ2IDAwMDAwIG4gCjAwMDAwMDAzNDAgMDAwMDAgbiAKdHJhaWxlcgo8PCAvUm9vdCAxIDAgUiAvU2l6ZSA2ID4+CnN0YXJ0eHJlZgo0MzUKJSVFT0Y=";

function toIsoMinusMinutes(minutes: number) {
  const date = new Date(Date.now() - minutes * 60_000);
  return date.toISOString();
}

function mockImageDataUrl(title: string, subtitle: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4aa59c"/><stop offset="100%" stop-color="#4aadf5"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><rect x="40" y="40" width="1120" height="720" rx="24" fill="#ffffff" fill-opacity="0.88"/><text x="80" y="170" font-size="46" font-family="Arial, sans-serif" fill="#1e293b">${title}</text><text x="80" y="240" font-size="30" font-family="Arial, sans-serif" fill="#334155">${subtitle}</text><text x="80" y="320" font-size="24" font-family="Arial, sans-serif" fill="#475569">Imagen de resultado mock para flujo clínico MVP</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildResultsMock(patientId: string): MedicalResultsBundle {
  const summariesBase: MedicalResultSummary[] = [
    {
      id: `res-${patientId}-lab-1`,
      patientId,
      title: "Hemograma completo",
      type: "LAB",
      performedAt: toIsoMinusMinutes(95),
      status: "ready",
      formats: ["VALUES"],
      orderId: `ord-${patientId}-001`,
      sourceRefId: `enc-${patientId}-001`
    },
    {
      id: `res-${patientId}-rx-1`,
      patientId,
      title: "RX Tórax PA",
      type: "RX",
      performedAt: toIsoMinusMinutes(180),
      status: "ready",
      formats: ["PDF", "IMAGE"],
      orderId: `ord-${patientId}-002`,
      sourceRefId: `enc-${patientId}-001`
    },
    {
      id: `res-${patientId}-usg-1`,
      patientId,
      title: "USG abdominal",
      type: "USG",
      performedAt: toIsoMinusMinutes(35),
      status: "in_progress",
      formats: ["IMAGE"],
      orderId: `ord-${patientId}-003`,
      sourceRefId: `enc-${patientId}-002`
    }
  ];

  const summaries = summariesBase.sort((a, b) => (a.performedAt < b.performedAt ? 1 : -1));

  const detailsById: Record<string, MedicalResultDetail> = {
    [`res-${patientId}-lab-1`]: {
      id: `res-${patientId}-lab-1`,
      summary: summaries.find((row) => row.id === `res-${patientId}-lab-1`)!,
      valuesTable: [
        { parameter: "Hb", value: "13.8 g/dL", range: "12.0 - 16.0", flag: null },
        { parameter: "Leucocitos", value: "11.2 x10^3/uL", range: "4.0 - 10.5", flag: "HIGH" },
        { parameter: "Plaquetas", value: "245 x10^3/uL", range: "150 - 450", flag: null }
      ]
    },
    [`res-${patientId}-rx-1`]: {
      id: `res-${patientId}-rx-1`,
      summary: summaries.find((row) => row.id === `res-${patientId}-rx-1`)!,
      pdfUrl: MOCK_PDF_DATA_URL,
      imageUrls: [mockImageDataUrl("RX Tórax PA", `Paciente ${patientId}`)]
    },
    [`res-${patientId}-usg-1`]: {
      id: `res-${patientId}-usg-1`,
      summary: summaries.find((row) => row.id === `res-${patientId}-usg-1`)!,
      imageUrls: [mockImageDataUrl("USG abdominal", "Resultado en proceso")]
    }
  };

  return {
    summaries,
    detailsById,
    source: "mock",
    note: "TODO(results-modal): conectar detalle completo (PDF/imagen/valores) desde APIs clínicas reales."
  };
}
