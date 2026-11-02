"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";

type Option = {
    value: string; // "m:YYYY-MM" (buwan) o "w:YYYY-MM-DD" (linggo)
    label: string;
};

type Props = {
    months: Option[];
    weeks: Option[];
    current: string;
};

const fieldClass =
    "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-left text-sm font-medium text-gray-900 shadow-sm outline-none hover:border-[#9fcdb6] focus-visible:border-[#15664f] focus-visible:ring-2 focus-visible:ring-[#15664f]/20 disabled:opacity-60";

// Sariling dropdown (hindi native <select>) para kapareho ng ibang filter sa system:
// puting listahan, green na napili, at may check.
function PickerSelect({
    label,
    value,
    options,
    disabled,
    onChange,
    className = "",
}: {
    label: string;
    value: string;
    options: Option[];
    disabled?: boolean;
    onChange: (value: string) => void;
    className?: string;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<CSSProperties>({});

    // Isara kapag nag-click sa labas, Escape, scroll o resize
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const onMove = (e: Event) => {
            if (e.target instanceof Node && boxRef.current?.contains(e.target)) return;
            setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onMove, true);
        window.addEventListener("resize", onMove);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onMove, true);
            window.removeEventListener("resize", onMove);
        };
    }, [open]);

    const current = options.find((o) => o.value === value) ?? options[0];

    return (
        <div ref={boxRef} className={`relative min-w-0 ${className}`}>
            <button
                type="button"
                disabled={disabled}
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={(e) => {
                    if (!open) {
                        const r = e.currentTarget.getBoundingClientRect();
                        const below = window.innerHeight - r.bottom;
                        const maxH = 288;
                        const up = below < Math.min(maxH, 44 * options.length) + 8 && r.top > below;
                        setPos({
                            left: r.left,
                            width: r.width,
                            ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
                            maxHeight: Math.max(120, Math.min(maxH, (up ? r.top : below) - 12)),
                        });
                    }
                    setOpen((o) => !o);
                }}
                className={fieldClass}
            >
                <span className="min-w-0 truncate">{current?.label}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label={label}
                    style={pos}
                    className="fixed z-[60] overflow-y-auto rounded-xl border border-[#dcebe3] bg-white py-1 shadow-lg shadow-[#15664f]/10"
                >
                    {options.map((o) => {
                        const selected = o.value === value;
                        return (
                            <li key={o.value} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpen(false);
                                        if (!selected) onChange(o.value);
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm ${selected ? "bg-[#eef6f2] font-semibold text-[#15664f]" : "text-gray-900 hover:bg-[#f6faf8]"
                                        }`}
                                >
                                    <span className="min-w-0 break-words">{o.label}</span>
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

const VIEW_OPTIONS: Option[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
];

// Dalawang dropdown:
//   1) View: Week o Month
//   2) Aling linggo / buwan (nagbabago ang laman depende sa View)
export default function WeekPicker({ months, weeks, current }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const isMonth = current.startsWith("m:");

    function go(value: string) {
        const [kind, v] = value.split(":");
        startTransition(() => {
            // Binabasa ng page ang ?month= o ?week= at kinukuha ulit ang data
            router.push(`/dashboard/illness-alerts?${kind === "m" ? "month" : "week"}=${v}`, { scroll: false });
        });
    }

    return (
        <div className="flex w-full items-center gap-2 sm:w-auto" aria-busy={pending}>
            <span className="text-sm font-semibold text-gray-600">View</span>
            <PickerSelect
                label="View"
                value={isMonth ? "month" : "week"}
                options={VIEW_OPTIONS}
                disabled={pending}
                // Pagpalit ng View: ngayong linggo o ngayong buwan ang unang ipapakita
                onChange={(v) => go(v === "month" ? months[0].value : weeks[0].value)}
                className="w-28 shrink-0"
            />
            <PickerSelect
                label={isMonth ? "Month" : "Week"}
                value={current}
                options={isMonth ? months : weeks}
                disabled={pending}
                onChange={go}
                // Pirming lapad para hindi gumalaw kapag nagpalit ng Week/Month
                className="flex-1 sm:w-64 sm:flex-none"
            />
        </div>
    );
}