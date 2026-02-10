export default function PortalLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_at_5%_10%,rgba(74,173,245,0.16),transparent),radial-gradient(900px_at_95%_0%,rgba(74,165,156,0.16),transparent),linear-gradient(180deg,#f8fafc_0%,#eef6fb_50%,#f8fafc_100%)] text-slate-900">
      {children}
    </div>
  );
}
