import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  sub,
  subColor = "text-[#8a8272]",
  valueClassName = "text-2xl",
  compact = false,
}: {
  icon: LucideIcon;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  subColor?: string;
  valueClassName?: string;
  // Versión baja para que el Panel de escritorio quepa sin scroll.
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex min-w-0 items-center gap-3.5 rounded-3xl border border-[#EFE9DC] bg-white/70 px-4 py-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-[#6f6458]">{label}</div>
          <div className={`break-words font-semibold leading-tight text-[#2b2118] ${valueClassName}`}>{value}</div>
          {sub && <div className={`break-words text-[11px] ${subColor}`}>{sub}</div>}
        </div>
      </div>
    );
  }
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
