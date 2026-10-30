"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { searchPeople, type PersonHit } from "@/features/dashboard/search-actions";
import { InactiveBadge } from "@/components/shared/list-ui";

type Props = {
    /** Saan bubukas ang aktibong student / employee (hal. "/dashboard/student-health-records?student=") */
    studentHref: string;
    employeeHref: string;
    /** Archive Records (admin/nurse lang). null = hindi mabubuksan ang Deactivated. */
    archiveHref?: string | null;
};

// Search sa itaas ng dashboard: STUDENT at EMPLOYEE.
// Habang nagta-type, kusang lumalabas ang mga katugma. Enter = buksan ang naka-highlight
// (o ang una sa listahan). Puwede ring gamitin ang ↑ ↓ na arrow keys.
export default function StudentSearch({ studentHref, employeeHref, archiveHref }: Props) {
    const router = useRouter();
    const boxRef = useRef<HTMLDivElement>(null);
    const [q, setQ] = useState("");
    const [hits, setHits] = useState<PersonHit[]>([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [searched, setSearched] = useState("");
    const [pending, startTransition] = useTransition();

    // Maghanap 250ms pagkatapos tumigil sa pag-type
    useEffect(() => {
        const term = q.trim();
        // Walang tinype: walang hahanapin (nakatago na ang listahan dahil sa `showList`)
        if (!term) return;
        const t = setTimeout(() => {
            startTransition(async () => {
                const res = await searchPeople(term);
                setHits(res);
                setSearched(term);
                setActive(0);
                setOpen(true);
            });
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    // Isara kapag nag-click sa labas
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const canOpen = (p: PersonHit) => !p.archived || !!archiveHref;

    function go(p: PersonHit) {
        if (!canOpen(p)) return;
        setOpen(false);
        const num = encodeURIComponent(p.number);
        if (p.archived) {
            router.push(`${archiveHref}?type=${p.kind === "student" ? "students" : "employees"}&q=${num}`);
        } else {
            router.push(`${p.kind === "student" ? studentHref : employeeHref}${num}`);
        }
    }

    async function onEnter() {
        const term = q.trim();
        if (!term) return;
        // Kung tapos na ang paghahanap para sa tinype, buksan agad ang napili
        if (searched === term && hits.length > 0) return go(hits[active] ?? hits[0]);
        // Kung hindi pa, hanapin muna ngayon din
        const res = await searchPeople(term);
        setHits(res);
        setSearched(term);
        setActive(0);
        setOpen(true);
        if (res.length === 1) go(res[0]);
    }

    const showList = open && q.trim() !== "" && searched === q.trim();

    return (
        <div ref={boxRef} className="relative min-w-0 max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
                type="search"
                value={q}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => hits.length > 0 && setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        void onEnter();
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpen(true);
                        setActive((a) => Math.min(a + 1, Math.max(hits.length - 1, 0)));
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === "Escape") {
                        setOpen(false);
                    }
                }}
                autoComplete="off"
                placeholder="Search students or employees..."
                aria-label="Search students or employees"
                role="combobox"
                aria-expanded={showList}
                aria-controls="dashboard-person-results"
                suppressHydrationWarning
                className="h-11 w-full rounded-full border border-[#dcebe3] bg-white pl-11 pr-10 text-base md:text-sm text-gray-900 shadow-sm shadow-[#15664f]/5 outline-none transition focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10"
            />
            {pending && (
                <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#15664f]" />
            )}

            {showList && (
                <div
                    id="dashboard-person-results"
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[26rem] overflow-y-auto rounded-2xl border border-[#dcebe3] bg-white py-1.5 shadow-xl shadow-[#15664f]/15"
                >
                    {hits.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-600">No student or employee found for “{searched}”.</p>
                    ) : (
                        hits.map((p, i) => {
                            const isEmployee = p.kind === "employee";
                            return (
                                <button
                                    key={`${p.kind}-${p.number}`}
                                    type="button"
                                    role="option"
                                    aria-selected={i === active}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => go(p)}
                                    title={p.archived && !archiveHref ? "This record is deactivated" : undefined}
                                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${canOpen(p) ? "" : "cursor-default opacity-70"
                                        } ${i === active ? "bg-[#eef6f2]" : "hover:bg-[#f6faf8]"}`}
                                >
                                    {p.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                                    ) : (
                                        <span
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isEmployee ? "bg-amber-300 text-[#10523f]" : "bg-[#15664f] text-white"
                                                }`}
                                        >
                                            {`${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase()}
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                            {/* Buong pangalan (kasama ang middle name), hindi pinuputol */}
                                            <span className="break-words text-sm font-semibold text-gray-900">
                                                {[p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ")}
                                            </span>
                                            {p.archived && <InactiveBadge />}
                                        </span>
                                        <span className="block truncate text-sm text-gray-600">
                                            {[p.number, p.detail].filter(Boolean).join(" · ")}
                                        </span>
                                    </span>
                                    {/* Student = green, Employee = amber */}
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold ${isEmployee ? "bg-amber-300 text-[#10523f]" : "bg-[#15664f] text-white"
                                            }`}
                                    >
                                        {isEmployee ? "Employee" : "Student"}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}