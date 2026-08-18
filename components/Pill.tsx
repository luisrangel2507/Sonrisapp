import { Plus } from "lucide-react";

const TONES = {
  green: "bg-[#E8F0E3] border-[#BFD8B4] text-[#3F6B33]",
  rose: "bg-[#F7E5E0] border-[#EABDB0] text-[#B0503A]",
};

export function Pill({
  children,
  tone = "green",
  onClick,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full border py-3.5 text-[15px] font-semibold ${TONES[tone]}`}
    >
      <Plus size={16} strokeWidth={2.75} />
      {children}
    </button>
  );
}
