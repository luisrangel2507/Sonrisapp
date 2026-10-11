import { Plus, type LucideIcon } from "lucide-react";

const TONES = {
  green: "bg-[#E8F0E3] border-[#BFD8B4] text-[#3F6B33]",
  rose: "bg-[#F7E5E0] border-[#EABDB0] text-[#B0503A]",
  dark: "bg-[#5C2235] border-[#5C2235] text-white",
};

export function Pill({
  children,
  tone = "green",
  icon: Icon = Plus,
  onClick,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  icon?: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full border py-3.5 text-[15px] font-semibold ${TONES[tone]}`}
    >
      <Icon size={16} strokeWidth={2.75} />
      {children}
    </button>
  );
}
