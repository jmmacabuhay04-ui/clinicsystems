"use client";

import { useState } from "react";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function calcAge(y: number, m: number, d: number) {
    const today = new Date();
    let age = today.getFullYear() - y;
    const diff = today.getMonth() + 1 - m;
    if (diff < 0 || (diff === 0 && today.getDate() < d)) age--;
    return age;
}

export default function BirthdateField({
    name,
    defaultValue,
    inputClass,
}: {
    name: string;
    defaultValue?: string; // "YYYY-MM-DD"
    inputClass: string;
}) {
    const [y0, m0, d0] = (defaultValue ?? "").split("-");
    const [year, setYear] = useState(y0 ?? "");
    const [month, setMonth] = useState(m0 ? String(Number(m0)) : "");
    const [day, setDay] = useState(d0 ? String(Number(d0)) : "");

    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: thisYear - 1949 }, (_, i) => thisYear - i);

    const daysInMonth =
        year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // kung lumampas ang araw sa buwan (hal. Feb 31), alisin ang araw
    const safeDay = day && Number(day) > daysInMonth ? "" : day;

    const complete = year && month && safeDay;
    const value = complete
        ? `${year}-${month.padStart(2, "0")}-${safeDay.padStart(2, "0")}`
        : "";

    const age = complete
        ? calcAge(Number(year), Number(month), Number(safeDay))
        : null;

    const ageText =
        age === null ? "" : age < 0 ? "Invalid date" : `${age} years old`;

    return (
        <>
            <div className="space-y-1.5">
                <span className="block text-sm font-medium text-gray-700">Date of Birth</span>
                <div className="grid grid-cols-[1.6fr_1fr_1.2fr] gap-2">
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className={inputClass}
                        aria-label="Month"
                    >
                        <option value="">Month</option>
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={safeDay}
                        onChange={(e) => setDay(e.target.value)}
                        className={inputClass}
                        aria-label="Day"
                    >
                        <option value="">Day</option>
                        {days.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className={inputClass}
                        aria-label="Year"
                    >
                        <option value="">Year</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                {/* ito ang ipinapadala sa server action */}
                <input type="hidden" name={name} value={value} />
            </div>

            <div className="space-y-1.5">
                <span className="block text-sm font-medium text-gray-700">Age</span>
                <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={ageText}
                    placeholder="Automatic"
                    className={`${inputClass} bg-gray-50 text-gray-700`}
                />
            </div>
        </>
    );
}