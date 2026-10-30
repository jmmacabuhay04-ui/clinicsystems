"use client";

import { useState } from "react";
import { PieChart } from "lucide-react";

export type ReasonData = { label: string; clinic: number; dental: number; reports: number };
type Kind = "all" | "clinic" | "dental" | "reports";

// Kulay ng bawat dahilan sa donut (magkakaiba; gray = "Others")
const COLORS = ["#15664f", "#f59e0b", "#3b82f6", "#e11d48", "#9ca3af"];

const TAB_LABEL: Record<Kind, string> = { all: "All", clinic: "Clinic", dental: "Dental", reports: "Case Reports" };

// Visit Reasons na may tabs: All | Clinic | Dental | Case Reports.
// Bawat tab: donut + listahan ng dahilan para sa uring iyon lang.
export default function ReasonTabs({
    reasons,
    kinds,
    emptyText,
}: {
    reasons: ReasonData[];
    kinds: ("clinic" | "dental" | "reports")[];
    emptyText: string;
}) {
    const tabs: Kind[] = kinds.length > 1 ? ["all", ...kinds] : kinds;
    const [tab, setTab] = useState<Kind>(tabs[0] ?? "all");

    const countOf = (r: ReasonData, k: Kind) =>
        k === "all" ? kinds.reduce((sum, x) => sum + r[x], 0) : r[k];

    const list = reasons
        .map((r) => ({ label: r.label, value: countOf(r, tab) }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

    // Top 4 + "Others"
    const top = list.slice(0, 4);
    const othersValue = list.slice(4).reduce((sum, r) => sum + r.value, 0);
    const segments = [
        ...top.map((r, i) => ({ ...r, color: COLORS[i] })),
        ...(othersValue > 0 ? [{ label: "Others", value: othersValue, color: COLORS[4] }] : []),
    ];
    const total = segments.reduce((sum, s) => sum + s.value, 0);

    const R = 42;
    const C = 2 * Math.PI * R;
    let offset = 0;
    const arcs = segments.map((s) => {
        const len = total ? (s.value / total) * C : 0;
        const arc = { ...s, len, offset };
        offset += len;
        return arc;
    });

    return (
        <div>
            {tabs.length > 1 && (
                <div className="mb-4 flex gap-1 rounded-xl bg-[#f6faf8] p-1" role="tablist">
                    {tabs.map((k) => (
                        <button
                            key={k}
                            type="button"
                            role="tab"
                            aria-selected={tab === k}
                            onClick={() => setTab(k)}
                            className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-sm font-medium transition ${tab === k ? "bg-[#15664f] text-white shadow-sm" : "text-gray-600 hover:bg-white hover:text-[#15664f]"
                                }`}
                        >
                            {TAB_LABEL[k]}
                        </button>
                    ))}
                </div>
            )}

            {total === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                    <PieChart className="h-10 w-10 text-[#15664f]/30" />
                    <p className="mt-2 text-sm text-gray-600">{emptyText}</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
                    <div className="relative h-36 w-36 shrink-0 select-none">
                        <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label={`Visit reasons: ${TAB_LABEL[tab]}`}>
                            <circle cx={60} cy={60} r={R} fill="none" stroke="#f1f5f3" strokeWidth={18} />
                            <g transform="rotate(-90 60 60)">
                                {arcs.map((a) => (
                                    <circle
                                        key={a.label}
                                        cx={60}
                                        cy={60}
                                        r={R}
                                        fill="none"
                                        stroke={a.color}
                                        strokeWidth={18}
                                        strokeDasharray={`${a.len} ${C - a.len}`}
                                        strokeDashoffset={-a.offset}
                                    >
                                        <title>{`${a.label}: ${a.value}`}</title>
                                    </circle>
                                ))}
                            </g>
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-sm text-gray-600">Total</span>
                            <span className="text-2xl font-bold leading-tight text-[#15664f]">{total}</span>
                        </div>
                    </div>

                    <ul className="w-full min-w-0 space-y-2.5 text-sm">
                        {segments.map((s) => (
                            <li key={s.label} className="flex items-center justify-between gap-3">
                                <span className="flex min-w-0 items-center gap-2 text-gray-600">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="truncate capitalize" title={s.label}>
                                        {s.label}
                                    </span>
                                </span>
                                <span className="shrink-0 font-semibold text-gray-900">{s.value}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}