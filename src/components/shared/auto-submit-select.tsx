"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";

// Dropdown na kusang nagse-submit ng form pagkapili (para sa mga filter).
// Sariling dropdown (hindi native <select>) para ang listahan ay kasing-lapad
// ng field at hindi lumalampas sa screen ng phone.
type Props = {
    name: string;
    defaultValue: string;
    options: string[];
    allLabel?: string;
    /** Opsyonal na ipapakitang label bawat value (hal. { student: "Students (12)" }) */
    labels?: Record<string, string>;
    className?: string;
};

export default function AutoSubmitSelect({
    name,
    defaultValue,
    options,
    allLabel = "All",
    labels,
    className = "",
}: Props) {
    const boxRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    // Puwesto ng listahan (fixed), para hindi maputol ng card na may overflow-hidden
    const [pos, setPos] = useState<CSSProperties>({});

    // Kapag nagbago ang filter mula sa server (hal. Clear), sundan ito.
    const [lastDefault, setLastDefault] = useState(defaultValue);
    if (lastDefault !== defaultValue) {
        setLastDefault(defaultValue);
        setValue(defaultValue);
    }

    // Isara kapag nag-click sa labas o pinindot ang Escape
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);
        // Isara kapag nag-scroll / nag-resize (para hindi maiwan ang listahan)
        const onMove = (e: Event) => {
            if (e.target instanceof Node && boxRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        window.addEventListener("scroll", onMove, true);
        window.addEventListener("resize", onMove);
        return () => {
            window.removeEventListener("scroll", onMove, true);
            window.removeEventListener("resize", onMove);
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const items = [{ value: "", label: allLabel }, ...options.map((o) => ({ value: o, label: labels?.[o] ?? o }))];
    const current = items.find((i) => i.value === value) ?? items[0];

    function choose(v: string) {
        setOpen(false);
        if (v === value) return;
        setValue(v);
        const input = inputRef.current;
        if (!input) return;
        input.value = v; // para makuha agad ng form bago mag-submit
        input.form?.requestSubmit();
    }

    return (
        <div ref={boxRef} className="relative min-w-0">
            <input ref={inputRef} type="hidden" name={name} value={value} />
            <button
                type="button"
                onClick={(e) => {
                    if (!open) {
                        const r = e.currentTarget.getBoundingClientRect();
                        const below = window.innerHeight - r.bottom;
                        const maxH = 256;
                        // Pataas kapag kulang ang espasyo sa ibaba
                        const up = below < Math.min(maxH, 44 * items.length) + 8 && r.top > below;
                        setPos({
                            left: r.left,
                            width: r.width,
                            ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
                            maxHeight: Math.max(120, Math.min(maxH, (up ? r.top : below) - 12)),
                        });
                    }
                    setOpen((o) => !o);
                }}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`${className} flex items-center justify-between gap-2 text-left`}
            >
                <span className="min-w-0 truncate">{current.label}</span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    style={pos}
                    className="fixed z-[60] overflow-y-auto rounded-xl border border-[#dcebe3] bg-white py-1 shadow-lg shadow-[#15664f]/10"
                >
                    {items.map((i) => {
                        const selected = i.value === value;
                        return (
                            <li key={i.value || "__all"} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    onClick={() => choose(i.value)}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm ${selected
                                        ? "bg-[#eef6f2] font-semibold text-[#15664f]"
                                        : "text-gray-900 hover:bg-[#f6faf8]"
                                        }`}
                                >
                                    <span className="min-w-0 break-words">{i.label}</span>
                                    {selected && <Check className="h-4 w-4 shrink-0" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}