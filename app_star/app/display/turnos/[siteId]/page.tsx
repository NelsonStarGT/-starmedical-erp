import { Sora } from "next/font/google";
import { TurnosBoard } from "@/app/display/turnos/_components/TurnosBoard";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const dynamic = "force-dynamic";

export default function TurnosSitePage({ params }: { params: { siteId: string } }) {
  return (
    <div className={sora.className}>
      <TurnosBoard siteId={params.siteId} />
    </div>
  );
}
