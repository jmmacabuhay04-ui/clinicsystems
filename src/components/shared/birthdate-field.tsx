"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Date of Birth: tatlong dropdown (Month, Day, Year) + maliit na Age sa tabi na kusang kinukuwenta.
// Iisang cell na sumasakop ng 2 column sa form, para buo ang Month at maliit lang ang Age.
// Ipinapasa sa form bilang "YYYY-MM-DD" (hidden input na may pangalang `name`).

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function calcAge(y: number, m: number, d: number) {
    const today = new Date();
    let age = today.getFullYear() - y;
    const diff = today.getMonth() + 1 - m;
    if (diff < 0 || (diff === 0 && today.getDate() < d)) age--;
    return age;
}

const pad = (n: number) => String(n).padStart(2, "0");

// Sariling dropdown (hindi ang dropdown ng browser) para laging sa ILALIM ng kahon lumalabas
// ang listahan, may scroll, at kapareho ng itsura ng system.
function Picker({
    label,
    placeholder,
    value,
    options,
    onChange,
    buttonClass,
}: {
    label: string;
    placeholder: string;
    value: number;
    options: { value: number; label: string }[];
    onChange: (v: number) => void;
    buttonClass: string;
}) {
    const [open, setOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const current = options.find((o) => o.value === value);

    // Isara kapag nag-click sa labas o pinindot ang Esc
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey);
        // Ipakita agad ang napili sa listahan
        listRef.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "center" });
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div ref={boxRef} className="relative min-w-0">
            <button
                type="button"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={`${buttonClass} flex items-center justify-between gap-1 text-left`}
            >
                <span className={`truncate ${current ? "" : "text-gray-400"}`}>{current ? current.label : placeholder}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-600 transition ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <ul
                    ref={listRef}
                    role="listbox"
                    aria-label={label}
                    className="absolute left-0 top-full z-30 mt-1 max-h-60 min-w-full overflow-y-auto rounded-xl border border-[#dcebe3] bg-white py-1 shadow-xl shadow-[#15664f]/15"
                >
                    {options.map((o) => (
                        <li key={o.value}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={o.value === value}
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                                className={`block w-full whitespace-nowrap px-3 py-2 text-left text-sm ${o.value === value
                                    ? "bg-[#15664f] font-semibold text-white"
                                    : "text-gray-900 hover:bg-[#eef6f2] hover:text-[#15664f]"
                                    }`}
                            >
                                {o.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}


export default function BirthdateField({
    name,
    defaultValue,
    inputClass,
    span = "sm:col-span-2",
}: {
    name: string;
    defaultValue?: string; // "YYYY-MM-DD"
    inputClass: string;
    /** Ilang column ang sakop sa form grid (dapat tugma sa grid ng form) */
    span?: string;
}) {
    const [y0, m0, d0] = (defaultValue ?? "").split("-").map(Number);
    const [year, setYear] = useState(y0 || 0);
    const [month, setMonth] = useState(m0 || 0);
    const [day, setDay] = useState(d0 || 0);

    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: thisYear - 1950 + 1 }, (_, i) => thisYear - i);
    // Ilang araw sa napiling buwan (hal. Feb 2024 = 29)
    const daysInMonth = month ? new Date(year || 2000, month, 0).getDate() : 31;
    const safeDay = day > daysInMonth ? daysInMonth : day;

    const complete = year && month && safeDay;
    const value = complete ? `${year}-${pad(month)}-${pad(safeDay)}` : "";
    const age = complete ? calcAge(year, month, safeDay) : null;
    const ageText = age === null ? "" : age < 0 ? "Invalid" : `${age} ${age === 1 ? "yr" : "yrs"}`;

    // Mas makitid na padding sa dropdown para kasya ang buong text (hal. "September")
    const selectClass = `${inputClass} min-w-0 px-2.5!`;

    return (
        <div className={`grid min-w-0 grid-cols-[minmax(0,1fr)_5.5rem] gap-3 ${span}`}>
            <div className="min-w-0 space-y-1.5">
                <span className="block text-sm font-medium text-gray-600">Date of Birth</span>
                <input type="hidden" name={name} value={value} />
                <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(3.75rem,0.8fr)_minmax(5rem,1fr)] gap-2">
                    <Picker
                        label="Birth month"
                        placeholder="Month"
                        value={month}
                        options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
                        onChange={setMonth}
                        buttonClass={selectClass}
                    />
                    <Picker
                        label="Birth day"
                        placeholder="Day"
                        value={safeDay}
                        options={Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
                        onChange={setDay}
                        buttonClass={selectClass}
                    />
                    <Picker
                        label="Birth year"
                        placeholder="Year"
                        value={year}
                        options={years.map((yy) => ({ value: yy, label: String(yy) }))}
                        onChange={setYear}
                        buttonClass={selectClass}
                    />
                </div>
            </div>

            {/* Maliit na Age (kusang kinukuwenta) */}
            <div className="min-w-0 space-y-1.5">
                <span className="block text-sm font-medium text-gray-600">Age</span>
                <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={ageText}
                    placeholder="—"
                    aria-label="Age"
                    className={`${inputClass} bg-gray-50 px-2.5! text-center text-gray-600`}
                />
            </div>
        </div>
    );
}