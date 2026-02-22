import VerifyClient from "./verifyClient";

export const runtime = "nodejs";

export default function LabTestVerifyPage() {
  const nodeEnv = process.env.NODE_ENV;
  const mailpitEnabled = String(process.env.MAILPIT || "").toLowerCase() === "true";
  const showMailpitNotice = nodeEnv !== "production" && mailpitEnabled;
  return <VerifyClient showMailpitNotice={showMailpitNotice} />;
}
