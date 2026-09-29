import Image from "next/image";
import type { RenderedBlock } from "@/lib/types";

export function Blocks({ blocks }: { blocks: RenderedBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if (b.type === "html")
          return <div key={i} className={b.display ? "overflow-x-auto" : ""} dangerouslySetInnerHTML={{ __html: b.html }} />;
        if (b.type === "image")
          return b.src ? (
            <Image key={i} src={b.src} alt={b.alt} width={900} height={600}
              className="h-auto w-full max-w-xl rounded border bg-white" />
          ) : null;
        return (
          <div key={i} className="flex gap-3">
            <div className="w-12 shrink-0 pt-0.5 text-sm font-semibold text-slate-600">{b.label}</div>
            <div className="min-w-0 flex-1">
              <Blocks blocks={b.blocks} />
              {b.marks != null && <div className="mt-1 text-right text-xs text-slate-500">({b.marks})</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
