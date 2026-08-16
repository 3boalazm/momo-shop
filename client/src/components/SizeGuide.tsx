import { useState } from "react";
import { Ruler, ChevronDown } from "lucide-react";

/** Generic streetwear size chart (cm). Collapsible. */
const SIZE_CHART = [
  { size: "XS", chest: "88-92", length: "66", shoulder: "42" },
  { size: "S", chest: "94-98", length: "69", shoulder: "44" },
  { size: "M", chest: "100-104", length: "72", shoulder: "46" },
  { size: "L", chest: "106-110", length: "74", shoulder: "48" },
  { size: "XL", chest: "112-116", length: "76", shoulder: "50" },
  { size: "XXL", chest: "118-122", length: "78", shoulder: "52" },
];

export default function SizeGuide({ note }: { note?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass" style={{ borderRadius: "12px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="inline-flex items-center gap-2 font-bold text-sm uppercase tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
          <Ruler className="w-4 h-4 text-accent" /> Size Guide
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4">
          {note && <p className="text-sm text-dim mb-3">{note}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-dim text-xs uppercase tracking-widest">
                  <th className="text-left py-2 font-bold">Size</th>
                  <th className="text-left py-2 font-bold">Chest (cm)</th>
                  <th className="text-left py-2 font-bold">Length (cm)</th>
                  <th className="text-left py-2 font-bold">Shoulder (cm)</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((r) => (
                  <tr key={r.size} className="border-t border-momo">
                    <td className="py-2 font-bold">{r.size}</td>
                    <td className="py-2 text-dim">{r.chest}</td>
                    <td className="py-2 text-dim">{r.length}</td>
                    <td className="py-2 text-dim">{r.shoulder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-dim text-xs mt-3">Measurements are approximate. Allow 1-2 cm tolerance.</p>
        </div>
      )}
    </div>
  );
}
