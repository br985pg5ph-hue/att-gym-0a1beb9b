import { useEffect, useRef, useState } from "react";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

export function CountrySelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRIES.find((c) => c.code === value) || COUNTRIES[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-[46px] items-center gap-2 rounded-xl border hairline bg-card px-3 text-sm outline-none focus:border-primary"
      >
        <span className="text-base leading-none">{flagEmoji(selected.iso)}</span>
        <span>{selected.code}</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-64 overflow-auto rounded-xl border hairline bg-card p-1 shadow-lg">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted ${c.code === value ? "bg-muted" : ""}`}
            >
              <span className="text-base leading-none">{flagEmoji(c.iso)}</span>
              <span className="font-medium">{c.code}</span>
              <span className="ml-1 truncate text-muted-foreground">{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
