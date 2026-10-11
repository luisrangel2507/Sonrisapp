import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  sub,
  subColor = "text-[#8a8272]",
  valueClassName = "text-2xl",
}: {
  icon: LucideIcon;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  subColor?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={15} strokeWidth={2.25} />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">{label}</div>
      <div className={`mt-1 break-words font-semibold text-[#2b2118] ${valueClassName}`}>{value}</div>
      {sub && <div className={`mt-1 break-words text-[13px] ${subColor}`}>{sub}</div>}
    </div>
  );
}
