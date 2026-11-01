import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, CheckCircle2, School, ShieldAlert, Thermometer, Users } from "lucide-react";
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
    searchParams: Promise<{ week?: string; month?: string }>;
};

// Number of sick PERSONS in ONE day
const WARNING_PER_DAY = 5; // 5–9 persons in a day = Warning
const OUTBREAK_PER_DAY = 10; // 10+ persons in a day = Outbreak

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const statusStyles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

// Makinis na kurba mula sa mga punto (kapareho ng Clinic Visits Overview sa Dashboard)
function smoothPath(pts: [number, number][]) {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : "";
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? p2;
        const t = 0.18;
        // Hindi lalampas ang kurba sa pagitan ng dalawang punto (para hindi bumaba sa ilalim ng 0)
        const lo = Math.min(p1[1], p2[1]);
        const hi = Math.max(p1[1], p2[1]);
        const c1x = p1[0] + (p2[0] - p0[0]) * t;
        const c1y = Math.min(hi, Math.max(lo, p1[1] + (p2[1] - p0[1]) * t));
        const c2x = p2[0] - (p3[0] - p1[0]) * t;
        const c2y = Math.min(hi, Math.max(lo, p2[1] - (p3[1] - p1[1]) * t));
        d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
    }
    return d;
}

type DayPoint = { label: string; visits: number; reports: number };

// Line chart bawat araw (Week: Mon–Sat, Month: buong buwan), may guhit ng Warning at Outbreak
function TrendLineChart({ data }: { data: DayPoint[] }) {
    const series = [
        { key: "visits" as const, label: "Clinic Visits", color: "#15664f" },
        { key: "reports" as const, label: "Case Reports", color: "#3fae86" },
    ];
    // Malapad at mababa para hindi lumaki ang chart at text sa malaking screen
    const W = 900;
    const H = 250;
    const L = 38;
    const R = 30;
    const T = 14;
    const B = 30;
    const plotW = W - L - R;
    const plotH = H - T - B;
    const baseY = T + plotH;

    // Gilid ay 0, 2, 4, 6, ... (laging kita ang Outbreak line)
    const peak = Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key])));
    const top = Math.max(OUTBREAK_PER_DAY + 2, Math.ceil((peak + 1) / 2) * 2);
    const step = top <= 20 ? 2 : Math.ceil(top / 8 / 2) * 2;
    const yMax = Math.ceil(top / step) * step;
    const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);

    const x = (i: number) => L + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2);
    const y = (v: number) => T + plotH - (v / yMax) * plotH;

    const thresholds = [
        { value: WARNING_PER_DAY, label: `Warning · ${WARNING_PER_DAY}`, color: "#f59e0b" },
        { value: OUTBREAK_PER_DAY, label: `Outbreak · ${OUTBREAK_PER_DAY}`, color: "#dc2626" },
    ];

    return (
        <>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-[270px] w-full" role="img" aria-label="Clinic visits and case reports per day">
                <defs>
                    <linearGradient id="illness-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15664f" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#15664f" stopOpacity={0.02} />
                    </linearGradient>
                </defs>

                {/* grid + y labels */}
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#edf1ef" strokeWidth={1} />
                        <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={14} fill="#6b7280">
                            {t}
                        </text>
                    </g>
                ))}

                {/* Warning / Outbreak na guhit */}
                {thresholds.map((th) => (
                    <g key={th.value}>
                        <line x1={L} x2={W - R} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth={1.5} strokeDasharray="6 5" />
                        <text x={W - R} y={y(th.value) - 6} textAnchor="end" fontSize={15} fontWeight={700} fill={th.color}>
                            {th.label}
                        </text>
                    </g>
                ))}

                {/* Malambot na kulay sa ilalim ng Clinic Visits */}
                <path
                    d={`${smoothPath(data.map((d, i) => [x(i), y(d.visits)]))} L${x(data.length - 1)},${baseY} L${x(0)},${baseY} Z`}
                    fill="url(#illness-area)"
                />

                {/* mga linya + tuldok (huli ang Clinic Visits para nasa ibabaw) */}
                {[...series].reverse().map((s) => {
                    const main = s.key === "visits";
                    return (
                        <g key={s.key}>
                            <path
                                d={smoothPath(data.map((d, i) => [x(i), y(d[s.key])]))}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={main ? 3 : 2}
                                strokeLinecap="round"
                            />
                            {data.map((d, i) => (
                                <circle
                                    key={i}
                                    cx={x(i)}
                                    cy={y(d[s.key])}
                                    r={main ? 3 : 2.5}
                                    fill={s.color}
                                    stroke="#fff"
                                    strokeWidth={1.25}
                                >
                                    <title>{`${d.label} · ${s.label}: ${d[s.key]}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}

                {/* x labels: 1, 5, 10, 15, ... at huling araw */}
                {data.map((d, i) =>
                    data.length <= 12 ? (
                        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={14} fill="#6b7280">
                            {d.label}
                        </text>
                    ) : i === 0 || (i + 1) % 5 === 0 || i === data.length - 1 ? (
                        (i === data.length - 1 && (i + 1) % 5 !== 0 && data.length - 1 - (Math.floor((i + 1) / 5) * 5 - 1) < 3) ? null : (
                            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={14} fill="#6b7280">
                                {d.label}
                            </text>
                        )
                    ) : null,
                )}
            </svg>

            {/* Legend sa ibaba */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-gray-600">
                {series.map((s) => (
                    <span key={s.key} className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
        </>
    );
}

export default async function IllnessAlertsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;

    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
    const thisMonday = mondayOf(todayKey);

    const thisMonth = todayKey.slice(0, 7);
    const monthParam = /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : "";
    // Monthly kapag may ?month=, kung hindi ay Weekly
    const isMonth = !!monthParam;
    const unit = isMonth ? "Month" : "Week";

    const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? "") ? mondayOf(params.week!) : thisMonday;
    // Mon–Sat (6 araw), kapareho ng chart
    const weekEnd = addDays(weekStart, 5);

    // Saklaw ng data: buong buwan o isang linggo
    const monthFirst = `${monthParam || thisMonth}-01`;
    const [mY, mM] = (monthParam || thisMonth).split("-").map(Number);
    const monthLast = keyOf(new Date(Date.UTC(mY, mM, 0)));
    const rangeStart = isMonth ? monthFirst : weekStart;
    const rangeEnd = isMonth ? monthLast : weekEnd;
    const monthName = (ym: string) =>
        new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const periodLabel = isMonth ? monthName(monthParam) : label(weekStart, weekEnd);

    // Pagpipilian sa dropdown: huling 6 na buwan (Monthly) at huling 8 linggo (Weekly)
    const monthOptions = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(Date.UTC(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5, 7)) - 1 - i, 1));
        const ym = keyOf(d).slice(0, 7);
        return { value: `m:${ym}`, label: monthName(ym) };
    });
    const weekOptions = Array.from({ length: 8 }, (_, i) => {
        const start = addDays(thisMonday, -7 * i);
        return { value: `w:${start}`, label: label(start, addDays(start, 5)) };
    });
    const currentOption = isMonth ? `m:${monthParam}` : `w:${weekStart}`;

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
        AND r.visit_date BETWEEN CAST(${rangeStart} AS DATE) AND CAST(${rangeEnd} AS DATE)
      ORDER BY r.visit_date, r.record_id
    `,
        // Clinic visits ng mga employee (dati student lang ang kasama)
        prisma.$queryRaw<VisitRow[]>`
      SELECT r.record_id, r.visit_date, r.complaint, r.attending_staff,
             e.employee_number AS id_number, e.last_name, e.first_name
      FROM employee_health_records r
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.archived_at IS NULL
        AND r.visit_date BETWEEN CAST(${rangeStart} AS DATE) AND CAST(${rangeEnd} AS DATE)
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
        AND c.report_date BETWEEN CAST(${rangeStart} AS DATE) AND CAST(${rangeEnd} AS DATE)
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
    // Status ng clinic visit = status ng awtomatikong case report nito (hal. Pending / Resolved)
    const reportStatus = new Map(
        cases.filter((c) => c.source === "report").map((c) => [sameCase(c), { status: c.status, reference: c.reference }]),
    );
    for (const c of cases) {
        if (c.source !== "visit") continue;
        const linked = reportStatus.get(sameCase(c));
        if (linked) {
            c.status = linked.status;
            c.reference = linked.reference;
        }
    }
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
    const shortDate = (key: string) =>
        new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    // Bawat araw: ilang tao ang may sakit + ilang record (clinic visit / case report)
    const dayStats = (key: string) => {
        const dayCases = cases.filter((c) => keyOf(new Date(c.date)) === key);
        const people = new Set(dayCases.map((c) => `${c.patient_type}:${c.id_number ?? "?"}`));
        return {
            key,
            count: people.size,
            visitCount: dayCases.filter((c) => c.source === "visit").length,
            reportCount: dayCases.filter((c) => c.source === "report").length,
        };
    };
    type Bar = {
        name: string;
        sub: string;
        count: number;
        level: "safe" | "warning" | "outbreak";
        visitCount: number;
        reportCount: number;
        /** Petsa ng pinakamaraming may sakit (para sa "on Thu" / "on Oct 29") */
        peakLabel: string;
    };
    let daily: Bar[];
    if (isMonth) {
        // Monthly: isang bar bawat linggo (Mon–Sun, tuloy-tuloy ang petsa: Oct 1–4, 5–11, ...).
        // Ang taas ay ang pinakamaraming may sakit sa isang araw ng linggong iyon.
        daily = [];
        for (let mon = mondayOf(monthFirst); mon <= monthLast; mon = addDays(mon, 7)) {
            const keys = Array.from({ length: 7 }, (_, i) => addDays(mon, i)).filter(
                (k) => k >= monthFirst && k <= monthLast,
            );
            if (keys.length === 0) continue;
            const days = keys.map(dayStats);
            const best = days.reduce((x, d) => (d.count > x.count ? d : x), days[0]);
            daily.push({
                name: `Week ${daily.length + 1}`,
                sub: `${shortDate(keys[0])}–${shortDate(keys[keys.length - 1]).replace(/^\w+ /, "")}`,
                count: best.count,
                level: levelOf(best.count),
                visitCount: days.reduce((n, d) => n + d.visitCount, 0),
                reportCount: days.reduce((n, d) => n + d.reportCount, 0),
                peakLabel: shortDate(best.key),
            });
        }
    } else {
        daily = dayNames.map((name, i) => {
            const d = dayStats(addDays(weekStart, i));
            return { name, sub: shortDate(d.key), count: d.count, level: levelOf(d.count), visitCount: d.visitCount, reportCount: d.reportCount, peakLabel: name };
        });
    }

    // Line chart: bawat araw (Week: Mon–Sat, Month: buong buwan)
    const trendDays: DayPoint[] = [];
    for (let k = rangeStart; k <= rangeEnd; k = addDays(k, 1)) {
        const d = dayStats(k);
        trendDays.push({ label: shortDate(k), visits: d.visitCount, reports: d.reportCount });
    }

    // Busiest day decides the alert level
    const peak = daily.reduce((best, d) => (d.count > best.count ? d : best), daily[0]);
    const level = levelOf(peak.count);


    const levels = {
        safe: {
            box: "bg-[#15664f]",
            tab: `Safe ${unit}`,
            mode: "Face-to-Face",
            title: `Safe ${unit} - Face-to-Face Classes Continue`,
            note: `No day reached ${WARNING_PER_DAY} sick persons. Standard health protocols apply.`,
            banner: "border-green-200 bg-green-50 text-green-800",
            icon: CheckCircle2,
            iconColor: "text-green-600",
            iconBg: "bg-green-100",
            pill: "bg-[#15664f] text-white",
            text: "text-[#15664f]",
        },
        warning: {
            box: "bg-[#f2b705]",
            tab: `Warning ${unit}`,
            mode: "Blended",
            title: `Warning ${unit} - Blended Classes Recommended`,
            note: `At least one day had ${WARNING_PER_DAY} or more sick persons. Increase health monitoring and limit large gatherings.`,
            banner: "border-amber-200 bg-amber-50 text-amber-800",
            icon: AlertTriangle,
            iconColor: "text-amber-600",
            iconBg: "bg-amber-100",
            pill: "bg-amber-400 text-gray-900",
            text: "text-amber-700",
        },
        outbreak: {
            box: "bg-red-600",
            tab: `Outbreak ${unit}`,
            mode: "Online Classes",
            title: `Outbreak ${unit} - Online Classes Recommended`,
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
            label: `Total Cases This ${unit}`,
            value: String(totalCases),
            hint: `${visitTotal} clinic visit${visitTotal === 1 ? "" : "s"} · ${reportTotal} case report${reportTotal === 1 ? "" : "s"}`,
            icon: Users,
            box: "bg-[#15664f]",
            tint: "bg-[#15664f]/10 text-[#15664f]",
            valueClass: "text-gray-900",
        },
        {
            label: "Highest Persons in a Day",
            value: peak.count > 0 ? String(peak.count) : "0",
            hint: peak.count > 0 ? `on ${peak.peakLabel}` : "No sick persons yet",
            icon: CalendarDays,
            box: "bg-[#f2b705]",
            tint: "bg-[#f2b705]/15 text-[#a67c00]",
            valueClass: "text-gray-900",
        },
        {
            label: "Top Illness",
            value: breakdown[0]?.illness ?? "—",
            hint: breakdown[0] ? `${breakdown[0].count} case${breakdown[0].count === 1 ? "" : "s"}` : "No cases yet",
            icon: Thermometer,
            box: "bg-[#3fae86]",
            tint: "bg-[#3fae86]/15 text-[#2a8a67]",
            valueClass: "text-gray-900",
        },
        {
            label: "Recommended Mode",
            value: current.mode,
            hint: current.tab,
            icon: School,
            box: current.box,
            tint: `${current.iconBg} ${current.iconColor}`,
            valueClass: current.text,
        },
    ];

    const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">{isMonth ? "Monthly" : "Weekly"} Illness Alert</h1>
                            <p className="text-sm text-gray-600">
                                {isMonth ? "Sick persons per week" : "Daily sick persons"} and the recommended class mode for{" "}
                                {periodLabel}.
                            </p>
                        </div>
                    </div>
                    <WeekPicker months={monthOptions} weeks={weekOptions} current={currentOption} />
                </div>
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
                        // Kapareho ng ibang page: puting card, may kulay na guhit sa itaas (s.box = kulay ng guhit)
                        <div key={s.label} className="relative flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border border-[#dcebe3] bg-white p-3 shadow-sm sm:p-4">
                            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${s.box}`} />
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.tint}`}>
                                <StatIcon className="h-5 w-5" strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-600">{s.label}</p>
                                <p className={`break-words text-xl font-bold leading-tight sm:text-2xl ${s.valueClass}`}>{s.value}</p>
                                {s.hint ? <p className="text-sm text-gray-600">{s.hint}</p> : null}
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
                {/* Daily trend */}
                <div className={`${card} min-w-0 p-5 md:p-6`}>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">{isMonth ? "Monthly Case Trend" : "Daily Case Trend"}</h2>
                    <TrendLineChart data={trendDays} />
                </div>

                {/* Illness breakdown */}
                <div className={`${card} flex min-w-0 flex-col p-4 md:p-5`}>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Illness Breakdown</h2>

                    {breakdown.length === 0 ? (
                        <p className="mb-4 py-6 text-center text-sm text-gray-600">No cases this {unit.toLowerCase()}.</p>
                    ) : (
                        <div className="mb-4 space-y-2.5">
                            {breakdown.map((b, i) => {
                                const share = totalCases > 0 ? (b.count / totalCases) * 100 : 0;
                                return (
                                    <div key={b.illness}>
                                        <div className="flex items-center justify-between gap-4 text-sm">
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-sm font-semibold text-[#15664f]">
                                                    {i + 1}
                                                </span>
                                                <span className="break-words font-semibold text-gray-900">{b.illness}</span>
                                            </span>
                                            <span className="shrink-0 text-gray-600">
                                                <span className="font-semibold text-gray-900">{b.count}</span> case
                                                {b.count === 1 ? "" : "s"} · {share.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                            <div className="h-full rounded-full bg-[#15664f]" style={{ width: `${share}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Nasa ibaba para pumantay sa taas ng Case Trend */}
                    <div className="mt-auto grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-sm font-semibold text-amber-700">Warning</p>
                            <p className="text-sm text-amber-900">
                                <span className="font-bold">{WARNING_PER_DAY}+</span> persons/day
                            </p>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-sm font-semibold text-red-700">Outbreak</p>
                            <p className="text-sm text-red-900">
                                <span className="font-bold">{OUTBREAK_PER_DAY}+</span> persons/day
                            </p>
                        </div>
                    </div>
                    {totalStudents > 0 && (
                        <p className="mt-2 text-sm text-gray-600">Out of {totalStudents} active students.</p>
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
                        No cases recorded this {unit.toLowerCase()}.
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
                                                <span className="flex flex-wrap items-center justify-end gap-1.5 md:justify-start">
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600">
                                                        Clinic Visit
                                                    </span>
                                                    {/* Status mula sa case report ng visit na ito */}
                                                    {c.status ? (
                                                        <span
                                                            className={`rounded-full px-2 py-0.5 text-sm font-medium capitalize ${statusStyles[c.status] ?? "bg-gray-100 text-gray-600"
                                                                }`}
                                                        >
                                                            {c.status}
                                                        </span>
                                                    ) : null}
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