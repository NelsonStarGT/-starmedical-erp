import { listSamples } from "@/lib/server/labtest.service";
import { SamplesClient } from "./SamplesClient";

export const runtime = "nodejs";

export default async function SamplesPage() {
  const samples = await listSamples();
  return <SamplesClient initialData={samples} />;
}
