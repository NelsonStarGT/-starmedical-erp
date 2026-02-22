type SectionPlaceholderProps = {
  title: string;
  description: string;
  items?: string[];
};

export default function SectionPlaceholder({ title, description, items = [] }: SectionPlaceholderProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#2e75ba40] bg-white px-5 py-6 shadow-sm">
      <p className="text-lg font-semibold text-[#2e75ba]">{title}</p>
      <p className="text-sm text-slate-600 mt-1">{description}</p>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
