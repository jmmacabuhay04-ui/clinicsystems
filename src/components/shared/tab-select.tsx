"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export type TabOption = {
    key: string;
    label: string;
    href: string;
    count?: number;
    /** Icon na naka-render na, hal. <Users className="h-4 w-4" /> */
    icon?: ReactNode;
};

/*
 * LAHAT NG SELECT / DROPDOWN NG SYSTEM (iisang itsura):
 *   - TabButtons  : mga tab na hiwa-hiwalay na button na may bilang (Referral Slips, Visitor Recording, Archive)
 *   - TabSelect   : tab na naka-dropdown; pagpili = lipat ng page (Reports)
 *                   (Reports, Referral Slips, Visitor Recording, Archive)
 *   - ValueSelect : pumili ng isang value sa form (may hidden input), hal. Auto-logout
 *   - AutoSubmitSelect : filter na kusang nagse-submit (hal. Status, Patient Type)
 *   - ComplaintSelect  : pumili ng ilang karaniwang complaint (Referral Slip), may Clear / Done
 *   - DateRangePicker  : petsa na may "Select For" at kalendaryo
 *                        (Illness Alerts, Referral Slips, Visitor Recording)
 *   - ToothIcon   : icon ng ngipin (walang tooth icon ang lucide-react)
 */

/** Isara ang dropdown kapag nag-click sa labas o pinindot ang Esc */
function useCloseOnOutside(open: boolean, setOpen: (v: boolean) => void) {
    const boxRef = useRef<HTMLDivElement>(null);
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
    }, [open, setOpen]);
    return boxRef;
}

// Itsura ng pindutan at listahan (pare-pareho sa lahat)
const triggerClass =
    "flex h-11 w-full items-center justify-between gap-2 rounded-lg border-2 border-[#cfe5d9] bg-white px-3 text-left text-sm font-semibold text-gray-900 shadow-sm outline-none hover:border-[#9fcdb6] focus-visible:border-[#15664f] focus-visible:ring-2 focus-visible:ring-[#15664f]/20";
const listClass =
    "absolute left-0 z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-[#dcebe3] bg-white py-1 shadow-lg shadow-[#15664f]/10 [scrollbar-width:thin]";
const itemClass = (selected: boolean) =>
    `flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm ${selected ? "bg-[#eef6f2] font-semibold text-[#15664f]" : "text-gray-900 hover:bg-[#f6faf8]"
    }`;

/** Icon ng ngipin (para sa Dental) */
export function ToothIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7.5 3C5 3 3 5 3 7.8c0 2.3.9 3.6 1.6 5 .8 1.6.9 3.4 1.3 5.4.3 1.6.8 2.8 1.9 2.8 1.3 0 1.6-1.6 1.9-3.4.3-1.6.7-3.1 2.3-3.1s2 1.5 2.3 3.1c.3 1.8.6 3.4 1.9 3.4 1.1 0 1.6-1.2 1.9-2.8.4-2 .5-3.8 1.3-5.4.7-1.4 1.6-2.7 1.6-5C21 5 19 3 16.5 3c-1.9 0-2.8 1-4.5 1S9.4 3 7.5 3Z" />
        </svg>
    );
}

// Mga tab na hiwa-hiwalay na button (may icon at bilang), kapareho ng dating Archive tabs.
// Phone: 2 column; mas malaking screen: magkakatabi.
export function TabButtons({ options, value, label }: { options: TabOption[]; value: string; label: string }) {
    return (
        <nav aria-label={label} className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            {options.map((t) => {
                const active = t.key === value;
                return (
                    <Link
                        key={t.key}
                        href={t.href}
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex h-10 min-w-0 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border-2 px-2.5 text-sm font-semibold transition-colors ${active
                            ? "border-[#15664f] bg-[#15664f] text-white shadow-sm"
                            : "border-[#cfe5d9] bg-white text-gray-600 hover:bg-[#eef6f2] hover:text-[#15664f]"
                            }`}
                    >
                        {t.icon && <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{t.icon}</span>}
                        <span className="min-w-0 flex-1 truncate sm:flex-none">{t.label}</span>
                        {t.count !== undefined && (
                            <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-sm font-semibold ${active ? "bg-white/20 text-white" : t.count > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                                    }`}
                            >
                                {t.count}
                            </span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}

// Pamalit sa mga tab. Nakalagay ang napili (may icon at bilang); pagpili = lipat sa page na iyon.
export default function TabSelect({
    options,
    value,
    label,
    className = "w-full sm:w-64",
}: {
    options: TabOption[];
    value: string;
    label: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const boxRef = useCloseOnOutside(open, setOpen);

    const current = options.find((o) => o.key === value) ?? options[0];
    if (!current) return null;

    return (
        <div ref={boxRef} className={`relative ${className}`}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen((o) => !o)}
                className={triggerClass}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {current.icon && <span className="shrink-0 text-[#15664f] [&_svg]:h-4 [&_svg]:w-4">{current.icon}</span>}
                    <span className="truncate">{current.label}</span>
                    {current.count !== undefined && (
                        <span className="shrink-0 rounded-full bg-[#eef6f2] px-1.5 py-0.5 text-sm font-semibold text-[#15664f]">
                            {current.count}
                        </span>
                    )}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label={label}
                    className={listClass}
                >
                    {options.map((o) => {
                        const selected = o.key === current.key;
                        return (
                            <li key={o.key} role="option" aria-selected={selected}>
                                <Link
                                    href={o.href}
                                    onClick={() => setOpen(false)}
                                    className={itemClass(selected)}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        {o.icon && <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{o.icon}</span>}
                                        <span className="truncate">{o.label}</span>
                                        {o.count !== undefined && (
                                            <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-sm font-semibold text-gray-600">
                                                {o.count}
                                            </span>
                                        )}
                                    </span>
                                    {selected && <Check className="h-4 w-4 shrink-0" />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// Pumili ng isang value sa form. May hidden input (name) kaya kasama sa pag-save ng form.
export function ValueSelect({
    name,
    value,
    onChange,
    options,
    label,
    className = "w-full sm:w-56",
}: {
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    label: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const boxRef = useCloseOnOutside(open, setOpen);
    const current = options.find((o) => o.value === value) ?? options[0];

    return (
        <div ref={boxRef} className={`relative ${className}`}>
            {/* Ito ang ipinapadala sa server */}
            <input type="hidden" name={name} value={current?.value ?? ""} />
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={label}
                onClick={() => setOpen((o) => !o)}
                className={triggerClass}
            >
                <span className="truncate font-medium">{current?.label}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <ul role="listbox" aria-label={label} className={listClass}>
                    {options.map((o) => {
                        const selected = o.value === current?.value;
                        return (
                            <li key={o.value} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(o.value);
                                        setOpen(false);
                                    }}
                                    className={itemClass(selected)}
                                >
                                    <span>{o.label}</span>
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

/* ===================== AutoSubmitSelect ===================== */

// Dropdown na kusang nagse-submit ng form pagkapili (para sa mga filter).
// Sariling dropdown (hindi native <select>) para ang listahan ay kasing-lapad
// ng field at hindi lumalampas sa screen ng phone.
type AutoSubmitProps = {
    name: string;
    defaultValue: string;
    options: string[];
    allLabel?: string;
    /** Opsyonal na ipapakitang label bawat value (hal. { student: "Students (12)" }) */
    labels?: Record<string, string>;
    className?: string;
};

export function AutoSubmitSelect({
    name,
    defaultValue,
    options,
    allLabel = "All",
    labels,
    className = "",
}: AutoSubmitProps) {
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

/* ===================== ComplaintSelect ===================== */

// Dropdown ng karaniwang complaint (kapareho ng ibang dropdown sa system).
// May check ang napili; pindutin ulit para tanggalin.
export function ComplaintSelect({
    templates,
    reason,
    onToggle,
}: {
    templates: readonly { label: string; text: string }[];
    reason: string;
    onToggle: (text: string) => void;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);

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

    const picked = templates.filter((t) => reason.includes(t.text)).map((t) => t.label);

    return (
        <div ref={boxRef} className="relative mb-2">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-900 outline-none hover:border-[#9fcdb6] focus-visible:border-[#15664f] focus-visible:ring-2 focus-visible:ring-[#15664f]/20"
            >
                <span className={`min-w-0 truncate ${picked.length ? "font-medium" : "text-gray-600"}`}>
                    {picked.length ? picked.join(", ") : "Select common complaint"}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-[#dcebe3] bg-white shadow-lg shadow-[#15664f]/10">
                    <ul
                        role="listbox"
                        aria-multiselectable="true"
                        className="max-h-60 overflow-y-auto py-1 [scrollbar-width:thin]"
                    >
                        {templates.map((t) => {
                            const selected = picked.includes(t.label);
                            return (
                                <li key={t.label} role="option" aria-selected={selected}>
                                    <button
                                        type="button"
                                        onClick={() => onToggle(t.text)}
                                        className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm ${selected ? "bg-[#eef6f2] font-semibold text-[#15664f]" : "text-gray-900 hover:bg-[#f6faf8]"
                                            }`}
                                    >
                                        <span>{t.label}</span>
                                        {selected && <Check className="h-4 w-4 shrink-0" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {/* Mga button sa ibaba: Clear (alisin lahat ng napili) at Done (isara) */}
                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-[#f6faf8] px-3 py-2">
                        <span className="text-sm text-gray-600">{picked.length} selected</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={picked.length === 0}
                                onClick={() => templates.filter((t) => reason.includes(t.text)).forEach((t) => onToggle(t.text))}
                                className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="h-9 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ===================== DateRangePicker ===================== */

// Date range picker ng Illness Alerts:
//   - mabilisang pagpili (Today, This Week, Last 7 days, ...)
//   - kalendaryo: pindutin ang simula, saka ang dulo ng range
//   - Cancel / Apply sa ibaba

type DateRangeProps = {
    /** Kasalukuyang range (YYYY-MM-DD) */
    from: string;
    to: string;
    /** Ngayong araw sa Manila (YYYY-MM-DD) */
    today: string;
    /** Nakikitang label, hal. "Nov 3 – Nov 8, 2026" */
    label: string;
    /** Napiling preset ngayon (para naka-highlight), hal. "week" */
    activePreset?: string;
    /**
     * Ibang page na gagamit ng picker (hal. Referral Slips).
     * Kapag may `basePath`, laging ?from=&to= ang ipapadala (kasama ang `query`, hal. "tab=teacher").
     */
    basePath?: string;
    query?: string;
};

const ILLNESS_BASE = "/dashboard/illness-alerts";
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
    { id: "today", label: "Today", href: (t) => `${ILLNESS_BASE}?from=${t}&to=${t}`, range: (t) => [t, t] },
    {
        id: "week",
        label: "This Week",
        href: (t) => `${ILLNESS_BASE}?week=${mondayOf(t)}`,
        range: (t) => [mondayOf(t), addDays(mondayOf(t), 5)],
    },
    { id: "7d", label: "Last 7 days", href: (t) => `${ILLNESS_BASE}?from=${addDays(t, -6)}&to=${t}`, range: (t) => [addDays(t, -6), t] },
    {
        id: "month",
        label: "This Month",
        href: (t) => `${ILLNESS_BASE}?month=${t.slice(0, 7)}`,
        range: (t) => [`${t.slice(0, 7)}-01`, keyOf(new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7), 0)))],
    },
    { id: "30d", label: "Last 30 days", href: (t) => `${ILLNESS_BASE}?from=${addDays(t, -29)}&to=${t}`, range: (t) => [addDays(t, -29), t] },
    {
        id: "lastmonth",
        label: "Last Month",
        href: (t) => `${ILLNESS_BASE}?month=${addMonths(`${t.slice(0, 7)}-01`, -1).slice(0, 7)}`,
        range: (t) => {
            const first = addMonths(`${t.slice(0, 7)}-01`, -1);
            return [first, addDays(`${t.slice(0, 7)}-01`, -1)];
        },
    },
    {
        id: "3m",
        label: "Last 3 Months",
        href: (t) => `${ILLNESS_BASE}?from=${addDays(addMonths(t, -3), 1)}&to=${t}`,
        range: (t) => [addDays(addMonths(t, -3), 1), t],
    },
    {
        id: "6m",
        label: "Last 6 Months",
        href: (t) => `${ILLNESS_BASE}?from=${addDays(addMonths(t, -6), 1)}&to=${t}`,
        range: (t) => [addDays(addMonths(t, -6), 1), t],
    },
];

export function DateRangePicker({ from, to, today, label, activePreset: givenPreset, basePath, query }: DateRangeProps) {
    // Walang ibinigay na preset: hanapin kung aling preset ang tugma sa kasalukuyang range
    const activePreset =
        givenPreset ?? PRESETS.find((p) => {
            const [a, b] = p.range(today);
            return a === from && b === to;
        })?.id;
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
        const href = basePath
            ? `${basePath}?${query ? `${query}&` : ""}from=${start}&to=${finish}`
            : p
                ? p.href(today)
                : `${ILLNESS_BASE}?from=${start}&to=${finish}`;
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