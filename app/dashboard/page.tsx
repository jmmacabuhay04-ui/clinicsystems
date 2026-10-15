import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Activity,
    ArrowRight,
    BarChart3,
    Briefcase,
    ChevronRight,
    FileText,
    ClipboardList,
    PieChart,
    Stethoscope,
    Sun,
    UserCheck,
    UserPlus,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ConfirmLink from "@/components/confirm-link";

type VisitRow = {
    record_id: number;
    patient_type: "student" | "employee";
    ref_number: string;
    last_name: string;
    first_name: string;
    complaint: string;
    visit_date: Date;
};

type DentalRow = {
    dental_id: number;
    ref_number: string;
    last_name: string | null;
    first_name: string | null;
    patient_type: string;
    procedure_name: string;
    visit_date: Date;
};

// Still needed for the "Pending Reports" stat card.
type CaseSummaryRow = {
    complaint: string;
    total: bigint;
    pending: bigint;
    grand_total: bigint;
    grand_pending: bigint;
    illness_types: bigint;
    last_visit: Date | null;
    week_visits: bigint;
};

type CountRow = { total: bigint };

// One row per day for the last 7 days (used by the overview chart + distribution).
type WeeklyRow = { day: Date; clinic: bigint; dental: bigint };

type WeeklyPoint = { label: string; clinic: number; dental: number };

type ActivityRow = {
    name: string | null;
    event_date: Date;
};

type ActivityItem = {
    key: string;
    kind: "clinic" | "dental" | "report";
    name: string;
    date: Date;
};

function formatVisitDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

type RecentRow = {
    key: string;
    name: string;
    type: "student" | "employee";
    detail: string;
    date: Date;
    href: string;
    message: string;
};

function RecentTable({
    title,
    detailLabel,
    rows,
    empty,
    viewTitle,
    viewAllHref,
    icon: Icon,
    iconClass,
}: {
    title: string;
    detailLabel: string;
    rows: RecentRow[];
    empty: string;
    viewTitle: string;
    viewAllHref: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    iconClass: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-2 px-3 py-3">
                <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${iconClass}`}>
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                    <h2 className="text-base font-semibold text-[#14532D]">{title}</h2>
                </div>
                <Link
                    href={viewAllHref}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#15664f] hover:underline"
                >
                    View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
            <div className="overflow-hidden px-3 pb-3">
                {rows.length === 0 ? (
                    <p className="p-5 text-center text-sm text-gray-700">{empty}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#EEEEEE] text-[#15664f]">
                                <tr>
                                    <th className="px-3 py-2 font-medium">Name</th>
                                    <th className="px-3 py-2 font-medium">{detailLabel}</th>
                                    <th className="px-3 py-2 font-medium">Type</th>
                                    <th className="whitespace-nowrap px-3 py-2 font-medium">Date</th>
                                    <th className="px-3 py-2 text-center font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.key} className="border-t border-gray-100">
                                        <td className="px-3 py-2 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    aria-hidden="true"
                                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${r.type === "employee"
                                                        ? "bg-amber-400 text-gray-900"
                                                        : "bg-[#15664f] text-white"
                                                        }`}
                                                >
                                                    {r.name
                                                        .split(" ")
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .map((w) => w[0])
                                                        .join("")
                                                        .toUpperCase()}
                                                </span>
                                                <span>{r.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">{r.detail}</td>
                                        <td className="px-3 py-2">
                                            <span
                                                className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${r.type === "employee"
                                                    ? "bg-amber-300 text-gray-900"
                                                    : "bg-[#15664f] text-white"

                                                    }`}
                                            >
                                                {r.type === "employee" ? "Employee" : "Student"}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                                            {formatVisitDate(r.date)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <ConfirmLink
                                                href={r.href}
                                                title={viewTitle}
                                                message={r.message}
                                                className="inline-block rounded-md bg-[#15664f] px-3 py-1 text-xs font-medium text-white hover:bg-[#124f3d]"
                                            >
                                                View
                                            </ConfirmLink>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function DentalList({
    title,
    rows,
    empty,
    viewHref,
}: {
    title: string;
    rows: DentalRow[];
    empty: string;
    viewHref: (row: DentalRow) => string;
}) {
    return (
        <RecentTable
            title={title}
            detailLabel="Procedure"
            empty={empty}
            viewTitle="View dental record"
            viewAllHref="/dashboard/dental-visits"
            icon={ToothIcon}
            iconClass="bg-amber-100 text-amber-600"
            rows={rows.map((d) => {
                const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unknown";
                return {
                    key: `${d.patient_type}-${d.dental_id}`,
                    name,
                    type: d.patient_type === "employee" ? "employee" : "student",
                    detail: d.procedure_name,
                    date: d.visit_date,
                    href: viewHref(d),
                    message: `Open the dental record of ${name}? This contains confidential medical information.`,
                };
            })}
        />
    );
}

function VisitList({
    title,
    rows,
    empty,
    viewHref,
}: {
    title: string;
    rows: VisitRow[];
    empty: string;
    viewHref: (visit: VisitRow) => string;
}) {
    return (
        <RecentTable
            title={title}
            detailLabel="Complaint"
            empty={empty}
            viewTitle="View health record"
            viewAllHref="/dashboard/clinic-visits"
            icon={Stethoscope}
            iconClass="bg-[#dff1ea] text-[#15664f]"
            rows={rows.map((v) => {
                const name = `${v.first_name} ${v.last_name}`;
                return {
                    key: `${v.patient_type}-${v.record_id}`,
                    name,
                    type: v.patient_type,
                    detail: v.complaint,
                    date: v.visit_date,
                    href: viewHref(v),
                    message: `Open the health record of ${name}? This contains confidential medical information and your access will be recorded.`,
                };
            })}
        />
    );
}

// Custom tooth icon (same props as the lucide icons used here).
function ToothIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3C5 3 3.5 4.7 3.5 7C3.5 9 4.3 10.4 4.9 12C5.5 13.7 5.5 15.5 6 17.2C6.4 18.7 7.2 21 8.5 21C10 21 10.1 18.4 10.6 16.7C10.8 16 11.2 15.5 12 15.5C12.8 15.5 13.2 16 13.4 16.7C13.9 18.4 14 21 15.5 21C16.8 21 17.6 18.7 18 17.2C18.5 15.5 18.5 13.7 19.1 12C19.7 10.4 20.5 9 20.5 7C20.5 4.7 19 3 17 3C15.3 3 14.4 4 12 4C9.6 4 8.7 3 7 3Z" />
        </svg>
    );
}

type QuickAction = {
    label: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    // Tailwind classes for the card background/border and the icon tile
    cardClass: string;
    iconClass: string;
};

function QuickActionsSection({
    actions,
    className,
}: {
    actions: QuickAction[];
    className?: string;
}) {
    return (
        <div className={`overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm ${className ?? ""}`}>
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-2.5">
                <div className="rounded-lg bg-amber-100 p-1.5 text-amber-600">
                    <Zap className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <h2 className="text-base font-semibold text-[#14532D]">Quick Actions</h2>
            </div>
            <div className="space-y-2 p-3">
                {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                        <Link
                            key={a.label}
                            href={a.href}
                            className={`flex items-center gap-3 rounded-xl border px-3 py-2 shadow-sm transition hover:shadow-md ${a.cardClass}`}
                        >
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${a.iconClass}`}
                            >
                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-tight text-gray-900">{a.label}</p>
                                <p className="text-xs leading-tight text-gray-700">{a.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* NEW: Overview chart, Visit Distribution, Recent Activity            */
/* ------------------------------------------------------------------ */

const CLINIC_COLOR = "#15664f";
const DENTAL_COLOR = "#f59e0b";
const PENDING_COLOR = "#dc2626";

function CardShell({
    title,
    subtitle,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${className ?? ""}`}>
            <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-[#dff1ea] p-1.5 text-[#15664f]">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-tight text-[#14532D]">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}

function VisitsOverviewChart({
    data,
    showClinic,
    showDental,
}: {
    data: WeeklyPoint[];
    showClinic: boolean;
    showDental: boolean;
}) {
    const W = 440;
    const H = 210;
    const L = 30;
    const R = 12;
    const T = 12;
    const B = 28;
    const plotW = W - L - R;
    const plotH = H - T - B;
    const baseY = T + plotH;

    const peak = Math.max(
        0,
        ...data.flatMap((d) => [showClinic ? d.clinic : 0, showDental ? d.dental : 0]),
    );
    const yMax = Math.max(4, Math.ceil(peak / 4) * 4);

    const x = (i: number) => L + (data.length > 1 ? (plotW * i) / (data.length - 1) : plotW / 2);
    const y = (v: number) => T + plotH - (v / yMax) * plotH;

    const ticks = [0, 1, 2, 3, 4].map((t) => (yMax * t) / 4);

    const series: { key: "clinic" | "dental"; color: string; show: boolean }[] = [
        { key: "clinic", color: CLINIC_COLOR, show: showClinic },
        { key: "dental", color: DENTAL_COLOR, show: showDental },
    ];

    return (
        <CardShell title="Clinic & Dental Visits Overview" subtitle="This week (Mon–Sat)" icon={BarChart3}>
            <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                {showClinic && <LegendDot color={CLINIC_COLOR} label="Clinic Visits" />}
                {showDental && <LegendDot color={DENTAL_COLOR} label="Dental Visits" />}
            </div>

            {data.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-700">No visit data yet.</p>
            ) : (
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="mx-auto h-auto max-h-[180px] w-full"
                    role="img"
                    aria-label="Clinic and dental visits for this week, Monday to Saturday"
                >
                    {/* grid + y labels */}
                    {ticks.map((t) => (
                        <g key={t}>
                            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
                            <text x={L - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#6b7280">
                                {t}
                            </text>
                        </g>
                    ))}

                    {/* area + line + dots */}
                    {series
                        .filter((s) => s.show)
                        .map((s) => {
                            const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ");
                            const area = `${x(0)},${baseY} ${pts} ${x(data.length - 1)},${baseY}`;
                            return (
                                <g key={s.key}>
                                    <polygon points={area} fill={s.color} opacity={0.12} />
                                    <polyline
                                        points={pts}
                                        fill="none"
                                        stroke={s.color}
                                        strokeWidth={2}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                    {data.map((d, i) => (
                                        <circle key={i} cx={x(i)} cy={y(d[s.key])} r={3} fill={s.color}>
                                            <title>{`${d.label}: ${d[s.key]}`}</title>
                                        </circle>
                                    ))}
                                </g>
                            );
                        })}

                    {/* x labels */}
                    {data.map((d, i) => (
                        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="#6b7280">
                            {d.label}
                        </text>
                    ))}
                </svg>
            )}
        </CardShell>
    );
}

function VisitDistribution({
    segments,
}: {
    segments: { label: string; value: number; color: string }[];
}) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const R = 40;
    const C = 2 * Math.PI * R;

    let offset = 0;
    const arcs = segments
        .filter((s) => s.value > 0)
        .map((s) => {
            const len = (s.value / total) * C;
            const arc = { ...s, len, offset };
            offset += len;
            return arc;
        });

    return (
        <CardShell title="Visit Distribution" subtitle="This week (Mon–Sat)" icon={PieChart}>
            <div className="flex flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
                <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label="Visit distribution">
                    <circle cx={60} cy={60} r={R} fill="none" stroke="#f3f4f6" strokeWidth={16} />
                    <g transform="rotate(-90 60 60)">
                        {arcs.map((a) => (
                            <circle
                                key={a.label}
                                cx={60}
                                cy={60}
                                r={R}
                                fill="none"
                                stroke={a.color}
                                strokeWidth={16}
                                strokeDasharray={`${a.len} ${C - a.len}`}
                                strokeDashoffset={-a.offset}
                            />
                        ))}
                    </g>
                    <text x={60} y={56} textAnchor="middle" fontSize={9} fill="#6b7280">
                        Total
                    </text>
                    <text x={60} y={72} textAnchor="middle" fontSize={18} fontWeight={600} fill="#15664f">
                        {total.toLocaleString("en-US")}
                    </text>
                </svg>

                <ul className="w-full space-y-2 text-sm">
                    {segments.map((s) => (
                        <li key={s.label} className="flex items-center justify-between gap-3">
                            <LegendDot color={s.color} label={s.label} />
                            <span className="font-medium text-gray-900">{s.value.toLocaleString("en-US")}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </CardShell>
    );
}

function relativeDay(date: Date, today: string) {
    const d = new Date(date).toISOString().slice(0, 10);
    const diff = Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
    if (diff <= 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff}d ago`;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function RecentActivity({ items, today }: { items: ActivityItem[]; today: string }) {
    const meta = {
        clinic: { icon: Stethoscope, tile: "bg-[#dff1ea] text-[#15664f]", text: (n: string) => `Clinic visit recorded for ${n}` },
        dental: { icon: ToothIcon, tile: "bg-sky-100 text-sky-700", text: (n: string) => `Dental visit recorded for ${n}` },
        report: { icon: ClipboardList, tile: "bg-amber-100 text-amber-700", text: (n: string) => `Case report created for ${n}` },
    } as const;

    return (
        <CardShell title="Recent Activity" subtitle="Latest records" icon={Activity}>
            {items.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-700">No recent activity.</p>
            ) : (
                <ul className="space-y-2">
                    {items.map((item) => {
                        const m = meta[item.kind];
                        const Icon = m.icon;
                        return (
                            <li key={item.key} className="flex items-center gap-3">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.tile}`}>
                                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                                </div>
                                <p className="min-w-0 flex-1 truncate text-sm text-[#15664f]">{m.text(item.name)}</p>
                                <span className="shrink-0 text-xs text-gray-600">{relativeDay(item.date, today)}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </CardShell>
    );
}

async function loadDashboard(isDentist: boolean, isDoctor: boolean, showEmployees: boolean) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    try {
        const [
            students,
            employees,
            visitsToday,
            recentVisits,
            caseSummary,
            visitors,
            dentalToday,
            recentDental,
            weekly,
            activityClinicStudent,
            activityClinicEmployee,
            activityDental,
            activityReports,
        ] = await Promise.all([
            prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM students WHERE archived_at IS NULL
        `,
            showEmployees
                ? prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM employees
        `
                : Promise.resolve([] as CountRow[]),
            isDentist
                ? Promise.resolve([] as CountRow[])
                : prisma.$queryRaw<CountRow[]>`
          SELECT (
            (SELECT COUNT(*) FROM health_records
              WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE))
            +
            (SELECT COUNT(*) FROM employee_health_records
              WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE))
          ) AS total
        `,
            isDentist
                ? Promise.resolve([] as VisitRow[])
                : prisma.$queryRaw<VisitRow[]>`
          SELECT v.record_id, v.patient_type, v.ref_number, v.last_name, v.first_name,
                 v.complaint, v.visit_date
          FROM (
            SELECT r.record_id, 'student'::text AS patient_type,
                   s.student_number AS ref_number, s.last_name, s.first_name,
                   r.complaint, r.visit_date
            FROM health_records r
            JOIN students s ON s.student_id = r.student_id
            WHERE r.archived_at IS NULL
              AND r.visit_date = CAST(${today} AS DATE)
            UNION ALL
            SELECT r.record_id, 'employee'::text AS patient_type,
                   e.employee_number AS ref_number, e.last_name, e.first_name,
                   r.complaint, r.visit_date
            FROM employee_health_records r
            JOIN employees e ON e.employee_id = r.employee_id
            WHERE r.archived_at IS NULL
              AND r.visit_date = CAST(${today} AS DATE)
          ) v
          ORDER BY v.visit_date DESC, v.record_id DESC
          LIMIT 8
        `,
            prisma.$queryRaw<CaseSummaryRow[]>`
          WITH visits AS (
            SELECT 'student'::text AS kind, student_id AS pid,
                   LOWER(TRIM(complaint)) AS ckey, complaint,
                   CAST(visit_date AS DATE) AS d
            FROM health_records WHERE archived_at IS NULL
            UNION ALL
            SELECT 'employee'::text, employee_id,
                   LOWER(TRIM(complaint)), complaint,
                   CAST(visit_date AS DATE)
            FROM employee_health_records WHERE archived_at IS NULL
          ),
          cases AS (
            SELECT CASE WHEN employee_id IS NOT NULL THEN 'employee' ELSE 'student' END::text AS kind,
                   COALESCE(employee_id, student_id) AS pid,
                   LOWER(TRIM(complaint)) AS ckey, complaint,
                   CAST(report_date AS DATE) AS d,
                   status::text AS status
            FROM health_case_reports WHERE archived_at IS NULL
          ),
          -- Every case report, plus every clinic visit that has no case report yet
          -- (counted as pending), so a visit never drops out of the summary.
          events AS (
            SELECT kind, pid, ckey, complaint, d, status FROM cases
            UNION ALL
            SELECT v.kind, v.pid, v.ckey, v.complaint, v.d, 'pending'::text
            FROM visits v
            WHERE NOT EXISTS (
              SELECT 1 FROM cases c
              WHERE c.kind = v.kind AND c.pid = v.pid AND c.ckey = v.ckey AND c.d = v.d
            )
          )
          SELECT MIN(e.complaint) AS complaint,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE e.status = 'pending') AS pending,
                 CAST(SUM(COUNT(*)) OVER () AS BIGINT) AS grand_total,
                 CAST(SUM(COUNT(*) FILTER (WHERE e.status = 'pending')) OVER () AS BIGINT) AS grand_pending,
                 CAST(COUNT(*) OVER () AS BIGINT) AS illness_types,
                 (SELECT MAX(v.d) FROM visits v WHERE v.ckey = e.ckey) AS last_visit,
                 (SELECT COUNT(*) FROM visits v
                   WHERE v.ckey = e.ckey
                     AND v.d >= CAST(${today} AS DATE) - 6) AS week_visits
          FROM events e
          GROUP BY e.ckey
          ORDER BY total DESC, MIN(e.complaint)
          LIMIT 6
        `,
            prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM visitor_logs
          WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
        `,
            prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM dental_records
          WHERE archived_at IS NULL AND CAST(visit_date AS DATE) = CAST(${today} AS DATE)
        `,
            prisma.$queryRaw<DentalRow[]>`
          SELECT d.dental_id,
                 COALESCE(s.student_number, e.employee_number) AS ref_number,
                 COALESCE(s.last_name, e.last_name)            AS last_name,
                 COALESCE(s.first_name, e.first_name)          AS first_name,
                 CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
                 d.procedure_name,
                 d.visit_date
          FROM dental_records d
          LEFT JOIN students s  ON s.student_id  = d.student_id
          LEFT JOIN employees e ON e.employee_id = d.employee_id
          WHERE d.archived_at IS NULL
            AND CAST(d.visit_date AS DATE) = CAST(${today} AS DATE)
          ORDER BY d.visit_date DESC, d.dental_id DESC
          LIMIT 8
        `,
            // ---- NEW: visits per day for the last 7 days (oldest -> today) ----
            prisma.$queryRaw<WeeklyRow[]>`
          SELECT (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n) AS day,
                 CAST(
                   (SELECT COUNT(*) FROM health_records
                     WHERE archived_at IS NULL
                       AND CAST(visit_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                   +
                   (SELECT COUNT(*) FROM employee_health_records
                     WHERE archived_at IS NULL
                       AND CAST(visit_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                 AS BIGINT) AS clinic,
                 CAST(
                   (SELECT COUNT(*) FROM dental_records
                     WHERE archived_at IS NULL
                       AND CAST(visit_date AS DATE) = (CAST(date_trunc('week', CAST(${today} AS DATE)) AS DATE) + n))
                 AS BIGINT) AS dental
          FROM generate_series(0, 5) AS n
          ORDER BY day ASC
        `,
            // ---- NEW: recent activity feed (role-aware, newest first) ----
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(s.first_name || ' ' || s.last_name) AS name,
                 CAST(r.visit_date AS DATE) AS event_date
          FROM health_records r
          JOIN students s ON s.student_id = r.student_id
          WHERE r.archived_at IS NULL
          ORDER BY r.visit_date DESC, r.record_id DESC
          LIMIT 5
        `,
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(e.first_name || ' ' || e.last_name) AS name,
                 CAST(r.visit_date AS DATE) AS event_date
          FROM employee_health_records r
          JOIN employees e ON e.employee_id = r.employee_id
          WHERE r.archived_at IS NULL
          ORDER BY r.visit_date DESC, r.record_id DESC
          LIMIT 5
        `,
            isDoctor
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) AS name,
                 CAST(d.visit_date AS DATE) AS event_date
          FROM dental_records d
          LEFT JOIN students s  ON s.student_id  = d.student_id
          LEFT JOIN employees e ON e.employee_id = d.employee_id
          WHERE d.archived_at IS NULL
          ORDER BY d.visit_date DESC, d.dental_id DESC
          LIMIT 5
        `,
            isDentist
                ? Promise.resolve([] as ActivityRow[])
                : prisma.$queryRaw<ActivityRow[]>`
          SELECT TRIM(COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)) AS name,
                 CAST(h.report_date AS DATE) AS event_date
          FROM health_case_reports h
          LEFT JOIN students s  ON s.student_id  = h.student_id
          LEFT JOIN employees e ON e.employee_id = h.employee_id
          WHERE h.archived_at IS NULL
          ORDER BY h.report_date DESC
          LIMIT 5
        `,
        ]);

        const weeklyPoints: WeeklyPoint[] = weekly.map((w) => ({
            label: new Date(w.day).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
            clinic: Number(w.clinic),
            dental: Number(w.dental),
        }));

        // `source` keeps keys unique even when two lists share the same kind
        // (e.g. student + employee clinic visits).
        const toItems = (
            rows: ActivityRow[],
            kind: ActivityItem["kind"],
            source: string,
        ): ActivityItem[] =>
            rows.map((r, i) => ({
                key: `${source}-${i}-${new Date(r.event_date).toISOString()}`,
                kind,
                name: r.name?.trim() || "Unknown",
                date: r.event_date,
            }));

        const activity = [
            ...toItems(activityClinicStudent, "clinic", "clinic-student"),
            ...toItems(activityClinicEmployee, "clinic", "clinic-employee"),
            ...toItems(activityDental, "dental", "dental"),
            ...toItems(activityReports, "report", "report"),
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        return {
            today,
            totalStudents: Number(students[0]?.total ?? 0),
            totalEmployees: Number(employees[0]?.total ?? 0),
            visitsToday: Number(visitsToday[0]?.total ?? 0),
            pendingReports: Number(caseSummary[0]?.grand_pending ?? 0),
            visitorsToday: Number(visitors[0]?.total ?? 0),
            dentalToday: Number(dentalToday[0]?.total ?? 0),
            recentVisits,
            recentDental,
            weeklyPoints,
            activity,
        };
    } catch (err) {
        console.error("Dashboard error:", err);
        return {
            today,
            totalStudents: 0,
            totalEmployees: 0,
            visitsToday: 0,
            pendingReports: 0,
            visitorsToday: 0,
            dentalToday: 0,
            recentVisits: [] as VisitRow[],
            recentDental: [] as DentalRow[],
            weeklyPoints: [] as WeeklyPoint[],
            activity: [] as ActivityItem[],
        };
    }
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    // Doctors do not handle dental records; dentists do not see clinic records.
    const role = String(session.role ?? "").toLowerCase();

    const isDoctor = role === "doctor";
    const isDentist = role === "dentist";
    const isAdmin = role === "admin" || role === "administrator";

    // Total Employees: admin, nurse, doctor, dentist
    const showEmployees =
        role === "admin" ||
        role === "administrator" ||
        role === "nurse" ||
        role === "doctor" ||
        role === "dentist";

    const data = await loadDashboard(isDentist, isDoctor, showEmployees);

    // Greeting based on the current hour in Manila.
    const hour =
        Number(
            new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                hour12: false,
                timeZone: "Asia/Manila",
            }).format(new Date()),
        ) % 24;
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const roleName = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";
    const greetingText = `${greeting}${roleName ? `, ${roleName}` : ""}!`;

    const stats: {
        label: string;
        value: number;
        icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
        hint: string;
        tone: "green" | "amber";
    }[] = [
            { label: "Total Students", value: data.totalStudents, icon: Users, hint: "Active students", tone: "green" },
            ...(showEmployees
                ? [{ label: "Total Employees", value: data.totalEmployees, icon: Briefcase, hint: "Registered staff", tone: "amber" as const }]
                : []),
            ...(isDentist
                ? []
                : [{ label: "Clinic Visits Today", value: data.visitsToday, icon: Activity, hint: "Recorded today", tone: "green" as const }]),
            ...(isDoctor
                ? []
                : [{ label: "Dental Visits Today", value: data.dentalToday, icon: ToothIcon, hint: "Recorded today", tone: "amber" as const }]),
            ...(isDentist
                ? []
                : [{ label: "Pending Reports", value: data.pendingReports, icon: FileText, hint: "Awaiting review", tone: "green" as const }]),
            { label: "Visitors Today", value: data.visitorsToday, icon: UserCheck, hint: "Logged today", tone: "amber" },
        ];

    const gridCols = isDentist
        ? "xl:grid-cols-4"
        : isDoctor
            ? "xl:grid-cols-5"
            : "xl:grid-cols-3 2xl:grid-cols-6";

    // Visit Distribution = totals for the same last-7-days window as the overview chart.
    const weekClinic = data.weeklyPoints.reduce((sum, p) => sum + p.clinic, 0);
    const weekDental = data.weeklyPoints.reduce((sum, p) => sum + p.dental, 0);
    const distributionSegments = [
        ...(isDentist ? [] : [{ label: "Clinic Visits", value: weekClinic, color: CLINIC_COLOR }]),
        ...(isDoctor ? [] : [{ label: "Dental Visits", value: weekDental, color: DENTAL_COLOR }]),
        ...(isDentist ? [] : [{ label: "Pending Reports", value: data.pendingReports, color: PENDING_COLOR }]),
    ];

    // NOTE: adjust the href values below to match your actual routes.
    const quickActions: QuickAction[] = [
        {
            label: "Add Student",
            description: "Register a new student",
            href: "/dashboard/student-health-records/students/new",
            icon: UserPlus,
            cardClass: "border-green-200 bg-green-50",
            iconClass: "bg-[#15664f]",
        },
        ...(showEmployees
            ? [
                {
                    label: "Add Employee",
                    description: "Register a new employee",
                    // TODO: i-check kung tama ang route na ito
                    href: "/dashboard/employee-health-records/employees/new",
                    icon: Briefcase,
                    cardClass: "border-green-200 bg-green-50",
                    iconClass: "bg-[#15664f]",
                },
            ]
            : []),
        // Doctors do not handle dental records.
        ...(isDoctor
            ? []
            : [
                {
                    label: "Add Dental",
                    description: "Record a new dental visit",
                    // TODO: i-check kung tama ang route na ito
                    href: "/dashboard/dental-records/new",
                    icon: ToothIcon,
                    cardClass: "border-sky-200 bg-sky-50",
                    iconClass: "bg-sky-600",
                },
            ]),
        ...(isDentist
            ? []
            : [
                {
                    label: "Log Clinic Visit",
                    description: "Record a new visit",
                    href: "/dashboard/student-health-records/new",
                    icon: Stethoscope,
                    cardClass: "border-green-200 bg-green-50",
                    iconClass: "bg-[#15664f]",
                },
                {
                    label: "New Case Report",
                    description: "Create a case report",
                    href: "/dashboard/health-case-reports/new",
                    icon: ClipboardList,
                    cardClass: "border-red-200 bg-red-50",
                    iconClass: "bg-red-700",
                },
            ]),
        {
            label: "View Reports",
            description: "Generate and view reports",
            href: "/dashboard/illness-alerts",
            icon: BarChart3,
            cardClass: "border-yellow-200 bg-yellow-50",
            iconClass: "bg-yellow-500",
        },
    ];

    return (
        <main className="min-w-0 space-y-5 p-4 md:p-6">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                    <Sun className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold text-[#14532D]">{greetingText}</h1>
                    <p className="text-sm text-gray-700">Here&apos;s what&apos;s happening today.</p>
                </div>
            </div>
            <section className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${gridCols}`}>
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className={`flex h-full min-w-0 flex-col overflow-hidden rounded-xl border p-3 shadow-sm ${stat.tone === "amber"
                                ? "border-amber-200 bg-amber-50"
                                : "border-green-200 bg-green-50"
                                }`}
                        >
                            <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${stat.tone === "amber" ? "bg-amber-500" : "bg-[#15664f]"
                                    }`}
                            >
                                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                            </div>
                            <p className="mt-2 min-h-[2rem] break-words text-sm font-medium leading-4 text-[#14532D]">
                                {stat.label}
                            </p>
                            <p className="pt-1 text-2xl font-semibold text-[#14532D]">
                                {stat.value.toLocaleString("en-US")}
                            </p>
                            <p className="mt-auto pt-0.5 text-xs text-gray-600">{stat.hint}</p>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-4 xl:grid-cols-5">
                {/* Lists on the left, Quick Actions on the right (same layout for every role) */}
                <div className="space-y-4 xl:col-span-3">
                    {!isDentist && (
                        <VisitList
                            title="Today's Clinic Visits"
                            rows={data.recentVisits}
                            empty="No clinic visits today."
                            viewHref={(v) =>
                                v.patient_type === "employee"
                                    ? `/dashboard/employee-health-records?employee=${encodeURIComponent(v.ref_number)}&view=history`
                                    : `/dashboard/student-health-records?student=${encodeURIComponent(v.ref_number)}&view=history`
                            }
                        />
                    )}
                    {!isDoctor && (
                        <DentalList
                            title="Today's Dental Visits"
                            rows={data.recentDental}
                            empty="No dental visits today."
                            viewHref={(d) =>
                                d.patient_type === "employee"
                                    ? `/dashboard/dental-records?employee=${encodeURIComponent(d.ref_number)}&view=history`
                                    : `/dashboard/dental-records?student=${encodeURIComponent(d.ref_number)}&view=history`
                            }
                        />
                    )}
                </div>

                <QuickActionsSection
                    actions={quickActions}
                    className="xl:col-span-2 xl:self-start"
                />
            </section>

            {/* NEW: Overview chart + Visit Distribution + Recent Activity */}
            <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1.2fr]">
                <VisitsOverviewChart
                    data={data.weeklyPoints}
                    showClinic={!isDentist}
                    showDental={!isDoctor}
                />
                <VisitDistribution segments={distributionSegments} />
                <RecentActivity items={data.activity} today={data.today} />
            </section>
        </main>
    );
}