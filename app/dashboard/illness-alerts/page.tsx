import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import WeekPicker from "./week-picker";

type VisitRow = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    attending_staff: string | null;
    student_number: string;
    last_name: string;
    first_name: string;
};

type ReportRow = {
    case_id: number;
    case_number: string;
    report_date: Date;
    complaint: string;
    staff_name: string | null;
    status: string;
    patient_type: string;
    id_number: string | null;
    last_name: string | null;
    first_name: string | null;
};

// Both sources are flattened into this shape so the chart, the breakdown
// and the case log can treat them the same way.
type Case = {
    key: string;
    date: Date;
    complaint: string;
    staff: string | null;
    patient_type: "student" | "employee";
    id_number: string | null;
    last_name: string | null;
    first_name: string | null;
    source: "visit" | "report";
    reference: string | null;
    status: string | null;
};

type Props = {
    searchParams: Promise<{ week?: string }>;
};

// Number of sick PERSONS in ONE day
const WARNING_PER_DAY = 5; // 5–9 persons in a day = Warning
const OUTBREAK_PER_DAY = 10; // 10+ persons in a day = Outbreak

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BASE = "/dashboard/illness-alerts";
const CASES_BASE = "/dashboard/health-case-reports";

function keyOf(d: Date) {
    return d.toISOString().slice(0, 10);
}

function addDays(key: string, n: number) {
    const d = new Date(`${key}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return keyOf(d);
}

function mondayOf(key: string) {
    const d = new Date(`${key}T00:00:00Z`);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return keyOf(d);
}

function label(start: string, end: string) {
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    const month = s.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const endMonth = e.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    const sameMonth = month === endMonth;
    return sameMonth
        ? `${month} ${s.getUTCDate()}-${e.getUTCDate()}, ${e.getUTCFullYear()}`
        : `${month} ${s.getUTCDate()} - ${endMonth} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
}

function formatDay(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
    });
}

function levelOf(count: number) {
    if (count >= OUTBREAK_PER_DAY) return "outbreak" as const;
    if (count >= WARNING_PER_DAY) return "warning" as const;
    return "safe" as const;
}

const barColor = {
    safe: "bg-[#15664f]",
    warning: "bg-amber-500",
    outbreak: "bg-red-600",
};

const statusStyles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

export default async function IllnessAlertsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;

    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const thisMonday = mondayOf(todayKey);

    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "")
        ? mondayOf(params.week!)
        : thisMonday;
    const weekEnd = addDays(weekStart, 4);

    const weeks = Array.from({ length: 8 }, (_, i) => {
        const start = addDays(thisMonday, -7 * i);
        return { value: start, label: label(start, addDays(start, 4)) };
    });

    const [studentRows, visits, reports] = await Promise.all([
        prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM students WHERE archived_at IS NULL
    `,
        prisma.$queryRaw<VisitRow[]>`
      SELECT r.record_id, r.visit_date, r.complaint, r.attending_staff,
             s.student_number, s.last_name, s.first_name
      FROM health_records r
      JOIN students s ON s.student_id = r.student_id
      WHERE r.archived_at IS NULL
        AND r.visit_date BETWEEN CAST(${weekStart} AS DATE) AND CAST(${weekEnd} AS DATE)
      ORDER BY r.visit_date, r.record_id
    `,
        prisma.$queryRaw<ReportRow[]>`
      SELECT c.case_id, c.case_number, c.report_date, c.complaint, c.staff_name, c.status,
             CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
             COALESCE(s.student_number, e.employee_number) AS id_number,
             COALESCE(s.last_name, e.last_name)            AS last_name,
             COALESCE(s.first_name, e.first_name)          AS first_name
      FROM health_case_reports c
      LEFT JOIN students  s ON s.student_id  = c.student_id
      LEFT JOIN employees e ON e.employee_id = c.employee_id
      WHERE c.archived_at IS NULL
        AND c.report_date BETWEEN CAST(${weekStart} AS DATE) AND CAST(${weekEnd} AS DATE)
      ORDER BY c.report_date, c.case_id
    `,

    ]);

    const totalStudents = Number(studentRows[0]?.total ?? 0);

    // Merge both sources into one list, sorted by date.
    const cases: Case[] = [
        ...visits.map((v) => ({
            key: `visit-${v.record_id}`,
            date: v.visit_date,
            complaint: v.complaint,
            staff: v.attending_staff,
            patient_type: "student" as const,
            id_number: v.student_number,
            last_name: v.last_name,
            first_name: v.first_name,
            source: "visit" as const,
            reference: null,
            status: null,
        })),
        ...reports.map((c) => ({
            key: `report-${c.case_id}`,
            date: c.report_date,
            complaint: c.complaint,
            staff: c.staff_name,
            patient_type: (c.patient_type === "employee" ? "employee" : "student") as
                | "student"
                | "employee",
            id_number: c.id_number,
            last_name: c.last_name,
            first_name: c.first_name,
            source: "report" as const,
            reference: c.case_number,
            status: c.status,
        })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalCases = cases.length;

    const breakdownMap = new Map<string, number>();
    for (const c of cases) {
        breakdownMap.set(c.complaint, (breakdownMap.get(c.complaint) ?? 0) + 1);
    }
    const breakdown = [...breakdownMap.entries()]
        .map(([illness, count]) => ({ illness, count }))
        .sort((a, b) => b.count - a.count);

    // The thresholds count PERSONS, not rows. A student with both a clinic
    // visit and a case report on the same day is still one sick person.
    const daily = dayNames.map((name, i) => {
        const key = addDays(weekStart, i);
        const people = new Set(
            cases
                .filter((c) => keyOf(new Date(c.date)) === key)
                .map((c) => `${c.patient_type}:${c.id_number ?? "?"}`)
        );
        const count = people.size;
        return { name, count, level: levelOf(count) };
    });

    // Busiest day decides the week's alert level
    const peak = daily.reduce((best, d) => (d.count > best.count ? d : best), daily[0]);
    const level = levelOf(peak.count);

    // Chart always shows at least up to the outbreak line
    const scale = Math.max(OUTBREAK_PER_DAY + 2, ...daily.map((d) => d.count));
    const linePos = (n: number) => `${(n / scale) * 100}%`;

    const levels = {
        safe: {
            tab: "Safe Week",
            mode: "Face-to-Face",
            title: "Safe Week - Face-to-Face Classes Continue",
            note: `No day reached ${WARNING_PER_DAY} sick persons. Standard health protocols apply.`,
            banner: "border-green-200 bg-green-50 text-green-800",
            icon: CheckCircle2,
            iconColor: "text-green-600",
        },
        warning: {
            tab: "Warning Week",
            mode: "Blended",
            title: "Warning Week - Blended Classes Recommended",
            note: `At least one day had ${WARNING_PER_DAY} or more sick persons. Increase health monitoring and limit large gatherings.`,
            banner: "border-amber-200 bg-amber-50 text-amber-800",
            icon: AlertTriangle,
            iconColor: "text-amber-600",
        },
        outbreak: {
            tab: "Outbreak Week",
            mode: "Online Classes",
            title: "Outbreak Week - Online Classes Recommended",
            note: `At least one day had ${OUTBREAK_PER_DAY} or more sick persons. Consider suspending face-to-face classes.`,
            banner: "border-red-200 bg-red-50 text-red-800",
            icon: ShieldAlert,
            iconColor: "text-red-600",
        },
    } as const;

    const current = levels[level];
    const Icon = current.icon;

    const stats = [
        {
            label: "Total Cases This Week",
            value: String(totalCases),
            hint: `${visits.length} clinic · ${reports.length} reported`,
        },
        {
            label: "Highest Persons in a Day",
            value: peak.count > 0 ? `${peak.count} · ${peak.name}` : "0",
            hint: null,
        },
        { label: "Top Illness", value: breakdown[0]?.illness ?? "—", hint: null },
        { label: "Recommended Mode", value: current.mode, hint: null },
    ];

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <h1 className="text-3xl font-semibold text-[#15664f]">Weekly Illness Alert Dashboard</h1>

                <WeekPicker weeks={weeks} current={weekStart} />
            </div>

            <div className="flex flex-wrap gap-3">
                {(["safe", "warning", "outbreak"] as const).map((key) => {
                    const active = level === key;
                    return (
                        <span
                            key={key}
                            className={`rounded-lg px-4 py-2 text-sm font-medium ${active
                                ? "bg-[#15664f] text-[#ffffff]"
                                : "border border-gray-200 bg-white text-[#15664f]"
                                }`}
                        >
                            {levels[key].tab}
                        </span>
                    );
                })}
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-lg text-[#15664f]">{s.label}</p>
                        <p className="mt-2 break-words text-2xl font-semibold text-[#15664f]">{s.value}</p>
                        {s.hint ? <p className="mt-1 text-xs text-gray-700">{s.hint}</p> : null}
                    </div>
                ))}
            </section>

            <section className={`flex items-start gap-3 rounded-xl border p-4 ${current.banner}`}>
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${current.iconColor}`} />
                <div>
                    <p className="font-semibold">{current.title}</p>
                    <p className="mt-1 text-sm">{current.note}</p>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                <div>
                    <h2 className="mb-3 text-lg font-semibold text-[#15664f]">Illness Breakdown</h2>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        {breakdown.length === 0 ? (
                            <p className="py-8 text-center text-sm text-gray-700">No cases this week.</p>
                        ) : (
                            <div className="space-y-5">
                                {breakdown.map((b) => {
                                    const pct = totalStudents > 0 ? (b.count / totalStudents) * 100 : 0;
                                    const barWidth = totalCases > 0 ? (b.count / totalCases) * 100 : 0;
                                    return (
                                        <div key={b.illness}>
                                            <div className="flex items-center justify-between gap-4 text-sm">
                                                <span className="font-medium text-[#15664f]">{b.illness}</span>
                                                <span className="shrink-0 text-gray-700">
                                                    {b.count} case{b.count === 1 ? "" : "s"} ({pct.toFixed(1)}% of students)
                                                </span>
                                            </div>
                                            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                    className="h-full rounded-full bg-[#15664f]"
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-700">Warning Threshold</span>
                                <span className="text-right font-medium text-amber-600">
                                    {totalStudents > 0 ? ((WARNING_PER_DAY / totalStudents) * 100).toFixed(1) : "0.0"}%
                                    <span className="ml-1 text-xs font-normal text-gray-700">
                                        ({WARNING_PER_DAY} persons per day)
                                    </span>
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-700">Outbreak Threshold</span>
                                <span className="text-right font-medium text-red-600">
                                    {totalStudents > 0 ? ((OUTBREAK_PER_DAY / totalStudents) * 100).toFixed(1) : "0.0"}%
                                    <span className="ml-1 text-xs font-normal text-gray-700">
                                        ({OUTBREAK_PER_DAY} persons per day)
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-lg font-semibold text-[#15664f]">Daily Case Trend</h2>
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex gap-4">
                            {/* Bars area */}
                            <div className="relative h-56 flex-1">
                                {/* Outbreak line */}
                                <div
                                    className="absolute inset-x-0 border-t-2 border-dashed border-red-400"
                                    style={{ bottom: linePos(OUTBREAK_PER_DAY) }}
                                >
                                    <span className="absolute -top-5 right-0 text-xs font-medium text-red-600">
                                        Outbreak ({OUTBREAK_PER_DAY})
                                    </span>
                                </div>
                                {/* Warning line */}
                                <div
                                    className="absolute inset-x-0 border-t-2 border-dashed border-amber-300"
                                    style={{ bottom: linePos(WARNING_PER_DAY) }}
                                >
                                    <span className="absolute -top-5 right-0 text-xs font-medium text-amber-600">
                                        Warning ({WARNING_PER_DAY})
                                    </span>
                                </div>

                                <div className="absolute inset-0 flex items-end gap-4 border-b border-gray-200">
                                    {daily.map((d) => (
                                        <div key={d.name} className="flex h-full flex-1 flex-col items-center justify-end">
                                            <span className="mb-1 text-sm font-semibold text-gray-700">{d.count}</span>
                                            <div
                                                className={`w-full max-w-14 rounded-t ${barColor[d.level]}`}
                                                style={{ height: `${(d.count / scale) * 100}%`, minHeight: "3px" }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Day labels */}
                        <div className="mt-2 flex gap-4">
                            {daily.map((d) => (
                                <span key={d.name} className="flex-1 text-center text-sm text-gray-700">
                                    {d.name}
                                </span>
                            ))}
                        </div>

                        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-700">
                            Each bar counts sick persons, not records. A student with both a clinic
                            visit and a case report on the same day counts once.
                        </p>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-semibold text-[#15664f]">
                    Weekly Case Log ({cases.length})
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {cases.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-700">No cases recorded this week.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#EEEEEE] text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">ID Number</th>
                                        <th className="px-4 py-3 font-medium">Patient</th>
                                        <th className="px-4 py-3 font-medium">Illness</th>
                                        <th className="px-4 py-3 font-medium">Source</th>
                                        <th className="px-4 py-3 font-medium">Attending Staff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.map((c) => (
                                        <tr key={c.key} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                                {formatDay(c.date)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {c.id_number ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {c.last_name}, {c.first_name}
                                                <span
                                                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${c.patient_type === "employee"
                                                        ? "bg-amber-300 text-gray-900"
                                                        : "bg-[#15664f]  text-white"
                                                        }`}
                                                >
                                                    {c.patient_type === "employee" ? "Employee" : "Student"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{c.complaint}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                {c.source === "visit" ? (
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                                        Clinic Visit
                                                    </span>
                                                ) : (
                                                    <span className="flex flex-wrap items-center gap-1.5">
                                                        <Link
                                                            href={`${CASES_BASE}?q=${encodeURIComponent(c.reference ?? "")}`}
                                                            className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200"
                                                        >
                                                            {c.reference ?? "Case Report"}
                                                        </Link>
                                                        {c.status ? (
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[c.status] ?? "bg-gray-100 text-gray-700"
                                                                    }`}
                                                            >
                                                                {c.status}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">{c.staff ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}