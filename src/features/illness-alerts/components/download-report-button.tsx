"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download } from "lucide-react";

type Series = { key: string; label: string; color: string };

const ALL_KEYS = ["visits", "reports", "dental"];

// "Download Report": pipiliin muna kung aling uri ang isasama (Clinic Visits,
// Health Reports, Dental Reports). Ang napiling period sa date picker ang susundin.
// Binubuksan ang print window: piliin ang "Save as PDF" para ma-download.
export default function DownloadReportButton({ fileName, series }: { fileName: string; series: Series[] }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [chosen, setChosen] = useState<string[]>(series.map((s) => s.key));

    // Isara kapag nag-click sa labas o pinindot ang Esc
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const toggle = (key: string) =>
        setChosen((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));

    function download() {
        if (chosen.length === 0) return;
        setOpen(false);

        // Itago sa report ang hindi napili:
        //   - linya sa graph at legend, hanay sa Case Log Summary
        //   - "Total" kapag hindi lahat ang napili
        //   (Laging kasama ang Illness Breakdown, pati sa Dentist)
        // Lahat ng uri sa report; itatago ang hindi napili O hindi pinapayagan sa role (hal. Dental sa Doctor)
        const hide = ALL_KEYS.filter((k) => !chosen.includes(k));
        if (hide.length > 0) hide.push("all");
        const style = document.createElement("style");
        style.textContent = hide.map((k) => `#illness-report [data-series="${k}"]{display:none !important}`).join("\n");
        document.head.appendChild(style);

        // Ito ang magiging pangalan ng PDF file
        const previous = document.title;
        const only = chosen.length < ALL_KEYS.length ? ` (${series.filter((s) => chosen.includes(s.key)).map((s) => s.label).join(", ")})` : "";
        document.title = `${fileName}${only}`;

        const restore = () => {
            document.title = previous;
            style.remove();
            window.removeEventListener("afterprint", restore);
        };
        window.addEventListener("afterprint", restore);
        // Hintayin munang mailapat ang style bago mag-print
        window.setTimeout(() => window.print(), 50);
    }

    return (
        <div ref={boxRef} className="relative print:hidden">
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f]"
            >
                <Download className="h-4 w-4" />
                Download Report
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[#dcebe3] bg-white p-3 shadow-lg shadow-[#15664f]/10">
                    <p className="px-1 text-sm font-semibold text-gray-900">Include in report</p>
                    <ul className="mt-2 space-y-1">
                        {series.map((s) => {
                            const on = chosen.includes(s.key);
                            return (
                                <li key={s.key}>
                                    <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={on}
                                        onClick={() => toggle(s.key)}
                                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm text-gray-900 hover:bg-[#f6faf8]"
                                    >
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${on ? "border-[#15664f] bg-[#15664f] text-white" : "border-gray-300 bg-white"
                                                }`}
                                        >
                                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                        </span>
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                                        {s.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {chosen.length === 0 && <p className="mt-1 px-1 text-sm text-red-600">Choose at least one.</p>}
                    <button
                        type="button"
                        onClick={download}
                        disabled={chosen.length === 0}
                        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#15664f] text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-50"
                    >
                        <Download className="h-4 w-4" />
                        Download
                    </button>
                </div>
            )}
        </div>
    );
}