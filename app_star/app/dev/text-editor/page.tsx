import { Nunito_Sans, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import TextEditorSandbox from "@/modules/text-editor/dev/TextEditorSandbox";

const heading = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-editor-heading"
});

const body = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-editor-body"
});

export default function TextEditorPage() {
  const blocked = process.env.NODE_ENV === "production" || process.env.DISABLE_DEV_TEXT_EDITOR === "1";
  if (blocked) notFound();

  return (
    <div className={`${heading.variable} ${body.variable}`}>
      <TextEditorSandbox />
    </div>
  );
}
