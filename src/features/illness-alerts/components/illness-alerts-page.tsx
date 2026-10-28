import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity, AlertTriangle, CalendarDays, CheckCircle2, School, ShieldAlert, Thermometer, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import WeekPicker from "./week-picker";

type VisitRow = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    attending_staff: string | null;
    id_number: string;
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

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right before:shrink-0 before:text-left before:text-sm before:font-semibold before:uppercase before:text-gray-600 before:content-[attr(data-label)] md:table-cell md:py-3 md:text-left md:before:hidden";

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

// Pinagsasama ang "fever", "Fever", "FEVER" at "  fever " bilang iisang sakit.
// Ginagawang malaking letra ang una para maganda ang label: "Fever", "Sakit ng ulo".
function normalizeComplaint(raw: string) {
    const text = raw.trim().replace(/\s+/g, " ").toLowerCase();
    if (!text) return "Unspecified";
    return text.charAt(0).toUpperCase() + text.slice(1);
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
    // Mon–Sat (6 araw), kapareho ng chart
    const weekEnd = addDays(weekStart, 5);

    const weeks = Array.from({ length: 8 }, (_, i) => {
        const start = addDays(thisMonday, -7 * i);
        return { value: start, label: label(start, addDays(start, 5)) };
    });

    const [studentRows, visits, employeeVisits, reports] = await Promise.all([
        prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) AS total FROM students WHERE archived_at IS NULL
    `,
        prisma.$queryRaw<VisitRow[]>`
      SELECT r.record_id, r.visit_date, r.complaint, r.attending_staff,
             s.student_number AS id_number, s.last_name, s.first_name
      FROM health_records r
      JOIN students s ON s.student_id = r.student_id
      WHERE r.archived_at IS NULL
        AND r.visit_date BETWEEN CAST(${weekStart} AS DATE) AND CAST(${weekEnd} AS DATE)
      ORDER BY r.visit_date, r.record_id
    `,
        // Clinic visits ng mga employee (dati student lang ang kasama)
        prisma.$queryRaw<VisitRow[]>`
      SELECT r.record_id, r.visit_date, r.complaint, r.attending_staff,
             e.employee_number AS id_number, e.last_name, e.first_name
      FROM employee_health_records r
      JOIN employees e ON e.employee_id = r.employee_id
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
            id_number: v.id_number,
            last_name: v.last_name,
            first_name: v.first_name,
            source: "visit" as const,
            reference: null,
            status: null,
        })),
        ...employeeVisits.map((v) => ({
            key: `emp-visit-${v.record_id}`,
            date: v.visit_date,
            complaint: v.complaint,
            staff: v.attending_staff,
            patient_type: "employee" as const,
            id_number: v.id_number,
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
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Bawat clinic visit ay awtomatikong gumagawa ng case report (parehong pasyente,
    // petsa, at complaint). Huwag itong bilangin nang dalawang beses.
    const sameCase = (c: (typeof cases)[number]) =>
        `${c.patient_type}:${c.id_number ?? "?"}:${keyOf(new Date(c.date))}:${normalizeComplaint(c.complaint)}`;
    const visitKeys = new Set(cases.filter((c) => c.source === "visit").map(sameCase));
    const uniqueCases = cases.filter((c) => c.source === "visit" || !visitKeys.has(sameCase(c)));
    cases.length = 0;
    cases.push(...uniqueCases);

    const totalCases = cases.length;
    const visitTotal = cases.filter((c) => c.source === "visit").length;
    const reportTotal = cases.filter((c) => c.source === "report").length;

    // Group by normalized complaint. Bukod sa bilang ng cases, itinatala rin ang
    // mga natatanging estudyante para hindi lumampas sa 100% ang "of students".
    const breakdownMap = new Map<string, { count: number; students: Set<string> }>();
    for (const c of cases) {
        const illness = normalizeComplaint(c.complaint);
        const entry = breakdownMap.get(illness) ?? { count: 0, students: new Set<string>() };
        entry.count += 1;
        if (c.patient_type === "student" && c.id_number) entry.students.add(c.id_number);
        breakdownMap.set(illness, entry);
    }
    const breakdown = [...breakdownMap.entries()]
        .map(([illness, { count, students }]) => ({ illness, count, studentCount: students.size }))
        .sort((a, b) => b.count - a.count);

    // The thresholds count PERSONS, not rows. A student with both a clinic
    // visit and a case report on the same day is still one sick person.
    const daily = dayNames.map((name, i) => {
        const key = addDays(weekStart, i);
        const dayCases = cases.filter((c) => keyOf(new Date(c.date)) === key);
        const people = new Set(dayCases.map((c) => `${c.patient_type}:${c.id_number ?? "?"}`));
        const count = people.size;
        // Bilang ng records (para makita kung ilan ang clinic visit at case report)
        const visitCount = dayCases.filter((c) => c.source === "visit").length;
        const reportCount = dayCases.filter((c) => c.source === "report").length;
        return { name, count, level: levelOf(count), visitCount, reportCount };
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
            iconBg: "bg-green-100",
            pill: "bg-[#15664f] text-white",
            text: "text-[#15664f]",
        },
        warning: {
            tab: "Warning Week",
            mode: "Blended",
            title: "Warning Week - Blended Classes Recommended",
            note: `At least one day had ${WARNING_PER_DAY} or more sick persons. Increase health monitoring and limit large gatherings.`,
            banner: "border-amber-200 bg-amber-50 text-amber-800",
            icon: AlertTriangle,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-100",
            pill: "bg-amber-400 text-gray-900",
            text: "text-amber-700",
        },
        outbreak: {
            tab: "Outbreak Week",
            mode: "Online Classes",
            title: "Outbreak Week - Online Classes Recommended",
            note: `At least one day had ${OUTBREAK_PER_DAY} or more sick persons. Consider suspending face-to-face classes.`,
            banner: "border-red-200 bg-red-50 text-red-800",
            icon: ShieldAlert,
            iconColor: "text-red-600",
            iconBg: "bg-red-100",
            pill: "bg-red-600 text-white",
            text: "text-red-700",
        },
    } as const;

    const current = levels[level];
    const Icon = current.icon;

    const stats = [
        {
            label: "Total Cases This Week",
            value: String(totalCases),
            hint: `${visitTotal} clinic visit${visitTotal === 1 ? "" : "s"} · ${reportTotal} case report${reportTotal === 1 ? "" : "s"}`,
            icon: Users,
            tint: "bg-[#eef6f2] text-[#15664f]",
            valueClass: "text-gray-900",
        },
        {
            label: "Highest Persons in a Day",
            value: peak.count > 0 ? String(peak.count) : "0",
            hint: peak.count > 0 ? `on ${peak.name}` : "No sick persons yet",
            icon: CalendarDays,
            tint: "bg-blue-50 text-blue-700",
            valueClass: "text-gray-900",
        },
        {
            label: "Top Illness",
            value: breakdown[0]?.illness ?? "—",
            hint: breakdown[0] ? `${breakdown[0].count} case${breakdown[0].count === 1 ? "" : "s"}` : "No cases yet",
            icon: Thermometer,
            tint: "bg-rose-50 text-rose-600",
            valueClass: "text-gray-900",
        },
        {
            label: "Recommended Mode",
            value: current.mode,
            hint: current.tab,
            icon: School,
            tint: `${current.iconBg} ${current.iconColor}`,
            valueClass: current.text,
        },
    ];

    const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";
    const dayDate = (i: number) =>
        new Date(`${addDays(weekStart, i)}T00:00:00Z`).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        });

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Activity className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Weekly Illness Alert</h1>
                        <p className="text-sm text-gray-600">
                            Daily sick persons and the recommended class mode for {label(weekStart, weekEnd)}.
                        </p>
                    </div>
                </div>
                <WeekPicker weeks={weeks} current={weekStart} />
            </div>

            {/* Alert level banner */}
            <section className={`rounded-xl border-2 p-5 shadow-sm md:p-6 ${current.banner}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${current.iconBg}`}>
                            <Icon className={`h-6 w-6 ${current.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-semibold">{current.title}</p>
                            <p className="mt-1 text-sm">{current.note}</p>
                        </div>
                    </div>

                    {/* Legend: which level is active */}
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {(["safe", "warning", "outbreak"] as const).map((key) => (
                            <span
                                key={key}
                                className={`rounded-full px-3 py-1 text-sm font-semibold ${level === key ? levels[key].pill : "bg-white/70 text-gray-600"
                                    }`}
                            >
                                {levels[key].tab}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stat cards */}
            {/* Mobile: 2 card bawat hilera, compact */}
            <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                {stats.map((s) => {
                    const StatIcon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className={`${card} flex min-w-0 flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-5`}
                        >
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${s.tint}`}>
                                <StatIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm leading-4 text-gray-600 sm:text-sm">{s.label}</p>
                                <p className={`mt-1 break-words text-xl font-bold leading-tight sm:text-2xl ${s.valueClass}`}>{s.value}</p>
                                {s.hint ? <p className="mt-0.5 text-sm text-gray-600 sm:text-sm">{s.hint}</p> : null}
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                {/* Daily trend */}
                <div className={`${card} min-w-0 p-5 md:p-6`}>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">Daily Case Trend</h2>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-[#15664f]" /> Safe
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Warning ({WARNING_PER_DAY}+)
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-sm bg-red-600" /> Outbreak ({OUTBREAK_PER_DAY}+)
                            </span>
                        </div>
                    </div>

                    <div className="relative h-64">
                        {/* Threshold lines */}
                        <div
                            className="absolute inset-x-0 border-t-2 border-dashed border-red-300"
                            style={{ bottom: linePos(OUTBREAK_PER_DAY) }}
                        >
                            <span className="absolute -top-5 right-0 rounded bg-white px-1 text-sm font-semibold text-red-600">
                                Outbreak · {OUTBREAK_PER_DAY}
                            </span>
                        </div>
                        <div
                            className="absolute inset-x-0 border-t-2 border-dashed border-amber-300"
                            style={{ bottom: linePos(WARNING_PER_DAY) }}
                        >
                            <span className="absolute -top-5 right-0 rounded bg-white px-1 text-sm font-semibold text-amber-600">
                                Warning · {WARNING_PER_DAY}
                            </span>
                        </div>

                        {/* Bars */}
                        <div className="absolute inset-0 flex items-end gap-3 border-b-2 border-gray-200 sm:gap-5">
                            {daily.map((d) => (
                                <div key={d.name} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                                    <span className={`mb-1 text-sm font-semibold ${d.count > 0 ? "text-gray-900" : "text-gray-600"}`}>
                                        {d.count}
                                    </span>
                                    <div
                                        className={`w-full max-w-16 rounded-t-md ${d.count > 0 ? barColor[d.level] : "bg-gray-200"}`}
                                        style={{ height: `${(d.count / scale) * 100}%`, minHeight: "4px" }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Day labels */}
                    <div className="mt-2 flex gap-3 sm:gap-5">
                        {daily.map((d, i) => (
                            <div key={d.name} className="min-w-0 flex-1 text-center">
                                <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                                <p className="text-sm text-gray-600">{dayDate(i)}</p>
                                {/* Clinic visits at case reports ng araw na ito */}
                                <div className="mt-1.5 flex flex-col items-center gap-0.5 text-sm font-semibold sm:flex-row sm:justify-center sm:gap-1">
                                    <span
                                        title="Clinic visits"
                                        className={`rounded px-1.5 py-0.5 ${d.visitCount > 0 ? "bg-[#eef6f2] text-[#15664f]" : "bg-gray-50 text-gray-300"}`}
                                    >
                                        V {d.visitCount}
                                    </span>
                                    <span
                                        title="Case reports"
                                        className={`rounded px-1.5 py-0.5 ${d.reportCount > 0 ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-gray-300"}`}
                                    >
                                        C {d.reportCount}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600">
                        Each bar counts sick persons from both <span className="font-semibold">clinic visits</span> (students
                        and employees) and <span className="font-semibold">case reports</span>. A person with both on the same
                        day counts once. Below each day: <span className="font-semibold text-[#15664f]">V</span> = clinic
                        visit records, <span className="font-semibold text-blue-700">C</span> = case report records.
                    </p>
                </div>

                {/* Illness breakdown */}
                <div className={`${card} min-w-0 p-5 md:p-6`}>
                    <h2 className="mb-5 text-lg font-semibold text-gray-900">Illness Breakdown</h2>

                    {breakdown.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-600">No cases this week.</p>
                    ) : (
                        <div className="space-y-4">
                            {breakdown.map((b, i) => {
                                const share = totalCases > 0 ? (b.count / totalCases) * 100 : 0;
                                return (
                                    <div key={b.illness}>
                                        <div className="flex items-center justify-between gap-4 text-sm">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                                    {i + 1}
                                                </span>
                                                <span className="break-words font-semibold text-gray-900">{b.illness}</span>
                                            </span>
                                            <span className="shrink-0 text-gray-600">
                                                <span className="font-semibold text-gray-900">{b.count}</span> case
                                                {b.count === 1 ? "" : "s"} · {share.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div className="h-full rounded-full bg-[#15664f]" style={{ width: `${share}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Warning threshold</p>
                            <p className="mt-1 text-sm text-amber-900">
                                <span className="text-lg font-bold">{WARNING_PER_DAY}+</span> sick persons in one day
                            </p>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-sm font-semibold uppercase tracking-wide text-red-700">Outbreak threshold</p>
                            <p className="mt-1 text-sm text-red-900">
                                <span className="text-lg font-bold">{OUTBREAK_PER_DAY}+</span> sick persons in one day
                            </p>
                        </div>
                    </div>
                    {totalStudents > 0 && (
                        <p className="mt-3 text-sm text-gray-600">Out of {totalStudents} active students.</p>
                    )}
                </div>
            </section>

            {/* Weekly case log */}
            <section className={`${card} overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 p-5 md:px-6">
                    <h2 className="text-lg font-semibold text-gray-900">Weekly Case Log</h2>
                    <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                        {cases.length} case{cases.length === 1 ? "" : "s"}
                    </span>
                </div>

                {cases.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">
                        No cases recorded this week.
                    </p>
                ) : (
                    <div className="border-t border-gray-100 p-3 md:overflow-x-auto md:p-0">
                        <table className="block w-full text-left text-sm md:table">
                            <thead className="hidden border-b border-gray-200 bg-[#f6faf8] text-gray-600 md:table-header-group">
                                <tr>
                                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Date</th>
                                    <th className="px-5 py-3 font-semibold">Patient</th>
                                    <th className="px-5 py-3 font-semibold">Type</th>
                                    <th className="px-5 py-3 font-semibold">Illness</th>
                                    <th className="px-5 py-3 font-semibold">Source</th>
                                    <th className="px-5 py-3 font-semibold">Attending Staff</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group">
                                {cases.map((c) => (
                                    <tr key={c.key} className={`${tr} md:hover:bg-[#f6faf8]`}>
                                        <td data-label="Date" className={`${td} text-gray-600 md:whitespace-nowrap md:px-5`}>
                                            {formatDay(c.date)}
                                        </td>
                                        <td data-label="Patient" className={`${td} md:px-5`}>
                                            <div className="md:text-left">
                                                <p className="font-medium text-gray-900">
                                                    {c.first_name} {c.last_name}
                                                </p>
                                                <p className="text-sm text-gray-600">{c.id_number ?? "—"}</p>
                                            </div>
                                        </td>
                                        {/* Sariling column ang Type para pantay-pantay ang badge */}
                                        <td data-label="Type" className={`${td} md:px-5`}>
                                            <span
                                                className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${c.patient_type === "employee"
                                                    ? "bg-amber-300 text-gray-900"
                                                    : "bg-[#15664f] text-white"
                                                    }`}
                                            >
                                                {c.patient_type === "employee" ? "Employee" : "Student"}
                                            </span>
                                        </td>
                                        <td data-label="Illness" className={`${td} break-words text-gray-900 md:px-5`}>
                                            {normalizeComplaint(c.complaint)}
                                        </td>
                                        <td data-label="Source" className={`${td} md:whitespace-nowrap md:px-5`}>
                                            {c.source === "visit" ? (
                                                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
                                                    Clinic Visit
                                                </span>
                                            ) : (
                                                <span className="flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
                                                    <Link
                                                        href={`${CASES_BASE}?q=${encodeURIComponent(c.reference ?? "")}`}
                                                        className="rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                                                    >
                                                        Case {c.reference ?? ""}
                                                    </Link>
                                                    {c.status ? (
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-sm font-medium capitalize ${statusStyles[c.status] ?? "bg-gray-100 text-gray-600"
                                                                }`}
                                                        >
                                                            {c.status}
                                                        </span>
                                                    ) : null}
                                                </span>
                                            )}
                                        </td>
                                        <td data-label="Staff" className={`${td} text-gray-600 md:px-5`}>
                                            {c.staff ?? "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}