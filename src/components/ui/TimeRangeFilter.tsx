"use client";

type TimeRangeFilterProps = {
  value: string;
  onChange: (range: string) => void;
  options?: { label: string; value: string }[];
};

const defaultOptions = [
  { label: "Today", value: "1d" },
  { label: "Week", value: "7d" },
  { label: "Month", value: "30d" },
  { label: "6M", value: "180d" },
  { label: "Year", value: "1y" },
];

export default function TimeRangeFilter({
  value,
  onChange,
  options = defaultOptions,
}: TimeRangeFilterProps) {
  return (
    <div className="inline-flex bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-1 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer border-none min-h-[32px] ${
            value === opt.value
              ? "bg-[#E51A1A] text-white shadow-sm"
              : "bg-transparent text-white/40 hover:text-white/70"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
