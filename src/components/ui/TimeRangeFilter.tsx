"use client";

type TimeRangeFilterProps = {
  value: string;
  onChange: (range: string) => void;
  options?: { label: string; value: string }[];
};

const defaultOptions = [
  { label: "Week", value: "7d" },
  { label: "Month", value: "30d" },
  { label: "3 Months", value: "90d" },
  { label: "Year", value: "1y" },
  { label: "All Time", value: "all" },
];

export default function TimeRangeFilter({
  value,
  onChange,
  options = defaultOptions,
}: TimeRangeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
            value === opt.value
              ? "bg-[#E51A1A] text-white border border-[#E51A1A]"
              : "bg-[#1E1E1E] text-white/50 border border-[#2A2A2A] hover:text-white/70"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
