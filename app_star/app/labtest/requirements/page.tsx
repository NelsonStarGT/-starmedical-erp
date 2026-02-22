import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default function RequirementsPage() {
  redirect("/labtest/orders");
}
