import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  sub,
  subColor = "text-[#8a8272]",
}: {
  icon: LucideIcon;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="rounded-3xl border border-[#EFE9DC] bg-white/70 p-4">
      <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={15} strokeWidth={2.25} />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#a49c8a]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#2b2118]">{value}</div>
      {sub && <div className={`mt-1 text-[13px] ${subColor}`}>{sub}</div>}
    </div>
  );
}
