"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

// Date range picker ng Illness Alerts:
//   - mabilisang pagpili (Today, This Week, Last 7 days, ...)
//   - kalendaryo: pindutin ang simula, saka ang dulo ng range
//   - Cancel / Apply sa ibaba

type Props = {
    /** Kasalukuyang range (YYYY-MM-DD) */
    from: string;
    to: string;
    /** Ngayong araw sa Manila (YYYY-MM-DD) */
    today: string;
    /** Nakikitang label, hal. "Nov 3 – Nov 8, 2026" */
    label: string;
    /** Napiling preset ngayon (para naka-highlight), hal. "week" */
    activePreset?: string;
};

const BASE = "/dashboard/illness-alerts";
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parse(key: string) {
    return new Date(`${key}T00:00:00Z`);
}
function keyOf(d: Date) {
    return d.toISOString().slice(0, 10);
}
function addDays(key: string, n: number) {
    const d = parse(key);
    d.setUTCDate(d.getUTCDate() + n);
    return keyOf(d);
}
function mondayOf(key: string) {
    const d = parse(key);
    const dow = (d.getUTCDay() + 6) % 7; // Mon = 0
    return addDays(key, -dow);
}
function addMonths(key: string, n: number) {
    const d = parse(key);
    const day = d.getUTCDate();
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
    const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
    t.setUTCDate(Math.min(day, last));
    return keyOf(t);
}
function pretty(key: string) {
    return parse(key).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

type Preset = { id: string; label: string; href: (today: string) => string; range: (today: string) => [string, string] };

// Ang "This Week", "This Month" at "Last Month" ay gumagamit ng dating Weekly/Monthly view
const PRESETS: Preset[] = [
    { id: "today", label: "Today", href: (t) => `${BASE}?from=${t}&to=${t}`, range: (t) => [t, t] },
    {
        id: "week",
        label: "This Week",
        href: (t) => `${BASE}?week=${mondayOf(t)}`,
        range: (t) => [mondayOf(t), addDays(mondayOf(t), 5)],
    },
    { id: "7d", label: "Last 7 days", href: (t) => `${BASE}?from=${addDays(t, -6)}&to=${t}`, range: (t) => [addDays(t, -6), t] },
    {
        id: "month",
        label: "This Month",
        href: (t) => `${BASE}?month=${t.slice(0, 7)}`,
        range: (t) => [`${t.slice(0, 7)}-01`, keyOf(new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)))],
    },
    { id: "30d", label: "Last 30 days", href: (t) => `${BASE}?from=${addDays(t, -29)}&to=${t}`, range: (t) => [addDays(t, -29), t] },
    {
        id: "lastmonth",
        label: "Last Month",
        href: (t) => `${BASE}?month=${addMonths(`${t.slice(0, 7)}-01`, -1).slice(0, 7)}`,
        range: (t) => {
            const first = addMonths(`${t.slice(0, 7)}-01`, -1);
            return [first, addDays(`${t.slice(0, 7)}-01`, -1)];
        },
    },
    {
        id: "3m",
        label: "Last 3 Months",
        href: (t) => `${BASE}?from=${addDays(addMonths(t, -3), 1)}&to=${t}`,
        range: (t) => [addDays(addMonths(t, -3), 1), t],
    },
    {
        id: "6m",
        label: "Last 6 Months",
        href: (t) => `${BASE}?from=${addDays(addMonths(t, -6), 1)}&to=${t}`,
        range: (t) => [addDays(addMonths(t, -6), 1), t],
    },
];

export default function DateRangePicker({ from, to, today, label, activePreset }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const boxRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

    // Pinipili pa lang (hindi pa na-Apply)
    const [start, setStart] = useState(from);
    const [end, setEnd] = useState<string | null>(to);
    const [preset, setPreset] = useState<string | undefined>(activePreset);
    const [presetOpen, setPresetOpen] = useState(false);
    const [view, setView] = useState(() => to.slice(0, 7)); // YYYY-MM na ipinapakita
    const [hover, setHover] = useState<string | null>(null);

    // Isara kapag nag-click sa labas o Esc
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

    function openPicker() {
        // Ibalik sa kasalukuyang range tuwing bubuksan
        setStart(from);
        setEnd(to);
        setPreset(activePreset);
        setView(to.slice(0, 7));
        setHover(null);
        setPresetOpen(false);
        setOpen((o) => !o);
    }

    function choosePreset(p: Preset) {
        const [a, b] = p.range(today);
        setStart(a);
        setEnd(b);
        setPreset(p.id);
        setView(b.slice(0, 7));
    }

    function clickDay(key: string) {
        if (key > today) return; // walang data sa hinaharap
        setPreset(undefined);
        if (!start || end) {
            // Bagong range: simula pa lang
            setStart(key);
            setEnd(null);
        } else if (key < start) {
            setEnd(start);
            setStart(key);
        } else {
            setEnd(key);
        }
    }

    function apply() {
        if (!start) return;
        const finish = end ?? start;
        const p = PRESETS.find((x) => x.id === preset);
        const href = p ? p.href(today) : `${BASE}?from=${start}&to=${finish}`;
        setOpen(false);
        startTransition(() => router.push(href, { scroll: false }));
    }

    // Mga araw ng kalendaryo (Lunes ang simula ng linggo)
    const [vy, vm] = view.split("-").map(Number);
    const first = `${view}-01`;
    const gridStart = mondayOf(first);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
    const lastShown = end ?? (hover && start && hover >= start ? hover : start);
    const inRange = (k: string) => !!start && !!lastShown && k >= start && k <= lastShown;

    const years = Array.from({ length: 6 }, (_, i) => Number(today.slice(0, 4)) - i);

    return (
        <div ref={boxRef} className="relative w-full sm:w-auto" aria-busy={pending}>
            <button
                type="button"
                onClick={openPicker}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-sm font-medium text-gray-900 shadow-sm hover:border-[#9fcdb6] sm:w-auto sm:min-w-[17rem]"
            >
                <span className="flex min-w-0 items-center gap-2">
                    <CalendarDays className="h-4 w-4 shrink-0 text-[#15664f]" />
                    <span className="truncate">{pending ? "Loading..." : label}</span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Select date range"
                    className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-[#dcebe3] bg-white p-3 shadow-xl shadow-[#15664f]/15"
                >
                    <p className="text-sm font-semibold text-gray-900">Select For</p>

                    {/* Mabilisang pagpili: dropdown */}
                    <div className="relative mt-2">
                        <button
                            type="button"
                            onClick={() => setPresetOpen((o) => !o)}
                            aria-haspopup="listbox"
                            aria-expanded={presetOpen}
                            className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-sm font-medium text-gray-900 hover:border-[#9fcdb6]"
                        >
                            <span className="truncate">{PRESETS.find((p) => p.id === preset)?.label ?? "Select"}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${presetOpen ? "rotate-180" : ""}`} />
                        </button>
                        {presetOpen && (
                            <ul
                                role="listbox"
                                className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-[#dcebe3] bg-white py-1 shadow-lg shadow-[#15664f]/10"
                            >
                                {PRESETS.map((p) => {
                                    const selected = preset === p.id;
                                    return (
                                        <li key={p.id} role="option" aria-selected={selected}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    choosePreset(p);
                                                    setPresetOpen(false);
                                                }}
                                                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${selected ? "bg-[#eef6f2] font-semibold text-[#15664f]" : "text-gray-900 hover:bg-[#f6faf8]"
                                                    }`}
                                            >
                                                {p.label}
                                                {selected && <Check className="h-4 w-4 shrink-0" />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {/* Buwan + taon */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                aria-label="Previous month"
                                onClick={() => setView(addMonths(`${view}-01`, -1).slice(0, 7))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="min-w-[5.5rem] text-center text-sm font-semibold text-gray-900">{MONTHS[vm - 1]}</span>
                            <button
                                type="button"
                                aria-label="Next month"
                                disabled={view >= today.slice(0, 7)}
                                onClick={() => setView(addMonths(`${view}-01`, 1).slice(0, 7))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f] disabled:opacity-30"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <select
                            aria-label="Year"
                            value={vy}
                            onChange={(e) => {
                                const y = e.target.value;
                                const ym = `${y}-${String(vm).padStart(2, "0")}`;
                                setView(ym > today.slice(0, 7) ? today.slice(0, 7) : ym);
                            }}
                            className="h-7 rounded-lg border border-gray-200 bg-white px-1.5 text-sm text-gray-900 outline-none focus:border-[#15664f]"
                        >
                            {years.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Kalendaryo */}
                    <div className="mt-2 grid grid-cols-7 gap-y-0.5 text-center">
                        {WEEKDAYS.map((w, i) => (
                            <span key={i} className="py-0.5 text-sm font-medium text-gray-500">
                                {w}
                            </span>
                        ))}
                        {days.map((k) => {
                            const outside = k.slice(0, 7) !== view;
                            const future = k > today;
                            const isEdge = k === start || k === lastShown;
                            const mid = inRange(k) && !isEdge;
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    disabled={future}
                                    onClick={() => clickDay(k)}
                                    onMouseEnter={() => setHover(k)}
                                    className={`h-7 text-sm transition-colors ${isEdge
                                        ? "rounded-lg bg-[#15664f] font-semibold text-white"
                                        : mid
                                            ? "bg-[#e3f1ea] text-[#10523f]"
                                            : future
                                                ? "cursor-not-allowed text-gray-300"
                                                : outside
                                                    ? "text-gray-400 hover:bg-gray-50"
                                                    : "rounded-lg text-gray-900 hover:bg-[#eef6f2]"
                                        } ${k === today && !isEdge ? "font-bold text-[#15664f]" : ""}`}
                                >
                                    {Number(k.slice(8, 10))}
                                </button>
                            );
                        })}
                    </div>

                    {/* Range + buttons */}
                    <div className="mt-3 space-y-2 border-t border-gray-100 pt-2.5">
                        <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-800">Range:</span>{" "}
                            {start ? `${pretty(start)} – ${pretty(end ?? start)}` : "—"}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="h-8 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={apply}
                                disabled={!start}
                                className="h-8 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}