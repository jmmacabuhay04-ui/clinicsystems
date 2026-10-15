import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Activity,
    BarChart3,
    Briefcase,
    ChevronRight,
    FileText,
    ClipboardList,
    Smile,
    Stethoscope,
    UserCheck,
    UserPlus,
    Users,
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
}: {
    title: string;
    detailLabel: string;
    rows: RecentRow[];
    empty: string;
    viewTitle: string;
}) {
    return (
        <div>
            <h2 className="mb-2 text-base font-semibold text-[#14532D]">{title}</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
                                        <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
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

type QuickAction = {
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
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
        <div className={className}>
            <h2 className="mb-2 text-base font-semibold text-[#14532D]">Quick Actions</h2>
            <div className="space-y-2">
                {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                        <Link
                            key={a.label}
                            href={a.href}
                            className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm transition hover:shadow-md ${a.cardClass}`}
                        >
                            <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${a.iconClass}`}
                            >
                                <Icon className="h-5 w-5" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                                <p className="text-xs text-gray-700">{a.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

async function loadDashboard(isDentist: boolean, showEmployees: boolean) {
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
        ]);

        return {
            totalStudents: Number(students[0]?.total ?? 0),
            totalEmployees: Number(employees[0]?.total ?? 0),
            visitsToday: Number(visitsToday[0]?.total ?? 0),
            pendingReports: Number(caseSummary[0]?.grand_pending ?? 0),
            visitorsToday: Number(visitors[0]?.total ?? 0),
            dentalToday: Number(dentalToday[0]?.total ?? 0),
            recentVisits,
            recentDental,
        };
    } catch (err) {
        console.error("Dashboard error:", err);
        return {
            totalStudents: 0,
            totalEmployees: 0,
            visitsToday: 0,
            pendingReports: 0,
            visitorsToday: 0,
            dentalToday: 0,
            recentVisits: [] as VisitRow[],
            recentDental: [] as DentalRow[],
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

    // Total Employees: admin, nurse, doctor, dentist
    const showEmployees =
        role === "admin" ||
        role === "administrator" ||
        role === "nurse" ||
        role === "doctor" ||
        role === "dentist";

    const data = await loadDashboard(isDentist, showEmployees);

    const stats: { label: string; value: number; icon: LucideIcon }[] = [
        { label: "Total Students", value: data.totalStudents, icon: Users },
        ...(showEmployees
            ? [{ label: "Total Employees", value: data.totalEmployees, icon: Briefcase }]
            : []),
        ...(isDentist
            ? []
            : [{ label: "Clinic Visits Today", value: data.visitsToday, icon: Activity }]),
        ...(isDoctor
            ? []
            : [{ label: "Dental Visits Today", value: data.dentalToday, icon: Stethoscope }]),
        ...(isDentist
            ? []
            : [{ label: "Pending Reports", value: data.pendingReports, icon: FileText }]),
        { label: "Visitors Today", value: data.visitorsToday, icon: UserCheck },
    ];

    const gridCols = isDentist
        ? "xl:grid-cols-4"
        : isDoctor
            ? "xl:grid-cols-5"
            : "xl:grid-cols-3 2xl:grid-cols-6";

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
                    icon: Smile,
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
            icon: Activity,
            cardClass: "border-yellow-200 bg-yellow-50",
            iconClass: "bg-yellow-500",
        },
    ];

    return (
        <main className="min-w-0 space-y-5 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-semibold text-[#15664f]">Dashboard</h1>
                <p className="mt-0.5 text-sm text-gray-700">Welcome back! Here&apos;s what&apos;s happening today.</p>
            </div>
            <section className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${gridCols}`}>
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="min-h-[2rem] min-w-0 flex-1 break-words text-xs leading-4 text-[#15664f]">
                                    {stat.label}
                                </p>
                                <div className="shrink-0 rounded-lg bg-[#dff1ea] p-1.5 text-[#15664f]">
                                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                                </div>
                            </div>
                            <p className="mt-auto pt-1 text-2xl font-semibold text-[#15664f]">
                                {stat.value.toLocaleString("en-US")}
                            </p>
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
        </main>
    );
}