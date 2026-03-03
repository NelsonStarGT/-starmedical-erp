type Props = {
  children: React.ReactNode;
};

export default function MembershipAffiliationsLayout({ children }: Props) {
  return <section className="space-y-3">{children}</section>;
}
