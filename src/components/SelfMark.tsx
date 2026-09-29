"use client";
import { MARKS, type Mark } from "@/lib/types";

const LABEL: Record<Mark, string> = { got: "Got it", partly: "Partly", missed: "Didn't get it" };
const STYLE: Record<Mark, string> = {
  got: "border-green-600 text-green-700 data-[on=true]:bg-green-600 data-[on=true]:text-white",
  partly: "border-amber-500 text-amber-700 data-[on=true]:bg-amber-500 data-[on=true]:text-white",
  missed: "border-red-600 text-red-700 data-[on=true]:bg-red-600 data-[on=true]:text-white",
};

export function SelfMark({ value, onChange }: { value?: Mark; onChange: (m: Mark) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MARKS.map((m) => (
        <button key={m} data-on={value === m} onClick={() => onChange(m)}
          className={`rounded-lg border-2 px-2 py-3 text-sm font-medium ${STYLE[m]}`}>
          {LABEL[m]}
        </button>
      ))}
    </div>
  );
}
