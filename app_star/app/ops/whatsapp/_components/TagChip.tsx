type TagChipProps = {
  label: string;
};

export default function TagChip({ label }: TagChipProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#4aadf5]/10 text-[#2e75ba] border border-[#4aadf5]/30 px-2 py-0.5 text-[11px] font-semibold">
      {label}
    </span>
  );
}
