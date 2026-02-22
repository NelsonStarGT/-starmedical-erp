import { redirect } from "next/navigation";

export default function WhatsAppLegacyRedirect({
  params
}: {
  params: { slug?: string[] };
}) {
  const slug = params.slug?.join("/") ?? "";
  redirect(`/ops/whatsapp/${slug}`);
}
