import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Activity,
    BarChart3,
    Briefcase,
    ChevronRight,
    FilePlus,
    FileText,
    Stethoscope,
    UserCheck,
    UserPlus,
    Users,
    type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Adjust these paths to match your real pages.
const ROUTES = {
    addStudent: "/dashboard/student-health-records/students/new",
    logVisit: "/dashboard/student-health-records/new",
    newCaseReport: "/dashboard/reports/new",
    viewReports: "/dashboard/reports",
    studentVisits: "/dashboard/student-health-records",
    studentVisitDetail: (id: number) => `/dashboard/student-health-records/edit?id=${id}`,
    employeeVisits: "/dashboard/employee-visits",
    employeeVisitDetail: (id: number) => `/dashboard/employee-visits/${id}`,
};

type VisitRow = {
    record_id: number;
    last_name: string;
    first_name: string;
    complaint: string;
    visit_date: Date;
};

type DentalRow = {
    dental_id: number;
    last_name: string | null;
    first_name: string | null;
    patient_type: string;
    procedure_name: string;
    visit_date: Date;
};

type CaseSummaryRow = {
    complaint: string;
    total: bigint;
};

type CountRow = { total: bigint };

const avatarColors = [
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-violet-600",
    "bg-red-500",
];

const levelStyles = {
    low: { label: "Low", className: "bg-blue-100 text-blue-700" },
    moderate: { label: "Moderate", className: "bg-yellow-100 text-yellow-800" },
    high: { label: "High", className: "bg-red-100 text-red-700" },
};

function levelFor(count: number) {
    if (count >= 10) return levelStyles.high;
    if (count >= 5) return levelStyles.moderate;
    return levelStyles.low;
}

function initials(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function formatVisitDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function DentalList({ title, rows, empty }: { title: string; rows: DentalRow[]; empty: string }) {
    return (
        <div>
            <h2 className="mb-3 text-lg font-semibold text-[#14532D]">{title}</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {rows.length === 0 ? (
                    <p className="p-8 text-center text-md text-gray-700">{empty}</p>
                ) : (
                    rows.map((d, index) => {
                        const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || "Unknown";
                        return (
                            <div
                                key={d.dental_id}
                                className="flex items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 last:border-0"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div
                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColors[index % avatarColors.length]}`}
                                    >
                                        {initials(name)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-gray-900">{name}</p>
                                        <p className="truncate text-sm text-gray-500">{d.procedure_name}</p>
                                    </div>
                                </div>
                                <p className="shrink-0 text-sm text-gray-500">{formatVisitDate(d.visit_date)}</p>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function VisitTable({
    title,
    nameLabel,
    rows,
    empty,
    listHref,
    rowHref,
}: {
    title: string;
    nameLabel: string;
    rows: VisitRow[];
    empty: string;
    listHref: string;
    rowHref: (id: number) => string;
}) {
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#14532D]">{title}</h2>
                <Link href={listHref} className="text-sm font-medium text-[#15664f] hover:underline">
                    View All &rarr;
                </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {rows.length === 0 ? (
                    <p className="p-8 text-center text-md text-gray-700">{empty}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                    <th className="whitespace-nowrap px-4 py-3 font-medium">{nameLabel}</th>
                                    <th className="px-4 py-3 font-medium">Reason</th>
                                    <th className="px-4 py-3 text-center font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((visit) => (
                                    <tr key={visit.record_id} className="border-t border-gray-100">
                                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                            {formatVisitDate(visit.visit_date)}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                                            {visit.first_name} {visit.last_name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{visit.complaint}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Link
                                                href={rowHref(visit.record_id)}
                                                className="inline-block rounded-md bg-[#15664f] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#124f3d]"
                                            >
                                                View
                                            </Link>
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

const quickActionTones = {
    green: { card: "border-emerald-100 bg-emerald-50", icon: "bg-[#15664f] text-white" },
    red: { card: "border-red-100 bg-red-50", icon: "bg-red-700 text-white" },
    yellow: { card: "border-amber-100 bg-amber-50", icon: "bg-amber-500 text-white" },
};

const quickActions: {
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
    tone: keyof typeof quickActionTones;
    roles: string[];
}[] = [
        {
            label: "Add Student",
            description: "Register a new student",
            href: ROUTES.addStudent,
            icon: UserPlus,
            tone: "green",
            roles: ["nurse"],
        },
        {
            label: "Log Clinic Visit",
            description: "Record a new visit",
            href: ROUTES.logVisit,
            icon: Stethoscope,
            tone: "green",
            roles: ["nurse", "doctor"],
        },
        {
            label: "New Case Report",
            description: "Create a case report",
            href: ROUTES.newCaseReport,
            icon: FilePlus,
            tone: "red",
            roles: ["nurse", "doctor"],
        },
        {
            label: "View Reports",
            description: "Generate and view reports",
            href: ROUTES.viewReports,
            icon: BarChart3,
            tone: "yellow",
            roles: ["nurse", "doctor", "admin", "administrator"],
        },
    ];

function QuickActions({ role }: { role: string }) {
    const items = quickActions.filter((a) => a.roles.includes(role));
    if (items.length === 0) return null;

    return (
        <div>
            <h2 className="mb-3 text-lg font-semibold text-[#14532D]">Quick Actions</h2>
            <div className="space-y-3">
                {items.map((a) => {
                    const Icon = a.icon;
                    const tone = quickActionTones[a.tone];
                    return (
                        <Link
                            key={a.label}
                            href={a.href}
                            className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition hover:shadow-md ${tone.card}`}
                        >
                            <div className={`rounded-lg p-3 ${tone.icon}`}>
                                <Icon className="h-6 w-6" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900">{a.label}</p>
                                <p className="text-sm text-gray-600">{a.description}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />
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
            pending,
            recentVisitsStudents,
            recentVisitsEmployees,
            caseSummary,
            visitors,
            dentalToday,
            recentDentalStudents,
            recentDentalEmployees,
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
          SELECT COUNT(*) AS total FROM health_records
          WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
        `,
            isDentist
                ? Promise.resolve([] as CountRow[])
                : prisma.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM health_case_reports
          WHERE archived_at IS NULL AND status = 'pending'
        `,
            isDentist
                ? Promise.resolve([] as VisitRow[])
                : prisma.$queryRaw<VisitRow[]>`
          SELECT r.record_id, s.last_name, s.first_name, r.complaint, r.visit_date
          FROM health_records r
          JOIN students s ON s.student_id = r.student_id
          WHERE r.archived_at IS NULL
          ORDER BY r.visit_date DESC, r.record_id DESC
          LIMIT 5
        `,
            isDentist
                ? Promise.resolve([] as VisitRow[])
                : prisma.$queryRaw<VisitRow[]>`
          SELECT r.record_id, e.last_name, e.first_name, r.complaint, r.visit_date
          FROM employee_health_records r
          JOIN employees e ON e.employee_id = r.employee_id
          WHERE r.archived_at IS NULL
          ORDER BY r.visit_date DESC, r.record_id DESC
          LIMIT 5
        `,
            isDentist
                ? Promise.resolve([] as CaseSummaryRow[])
                : prisma.$queryRaw<CaseSummaryRow[]>`
          SELECT complaint, COUNT(*) AS total
          FROM health_case_reports
          WHERE archived_at IS NULL
          GROUP BY complaint
          ORDER BY total DESC, complaint
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
          SELECT d.dental_id, s.last_name, s.first_name,
                 'Student' AS patient_type, d.procedure_name, d.visit_date
          FROM dental_records d
          JOIN students s ON s.student_id = d.student_id
          WHERE d.archived_at IS NULL
          ORDER BY d.visit_date DESC, d.dental_id DESC
          LIMIT 5
        `,
            prisma.$queryRaw<DentalRow[]>`
          SELECT d.dental_id, e.last_name, e.first_name,
                 'Employee' AS patient_type, d.procedure_name, d.visit_date
          FROM dental_records d
          JOIN employees e ON e.employee_id = d.employee_id
          WHERE d.archived_at IS NULL
          ORDER BY d.visit_date DESC, d.dental_id DESC
          LIMIT 5
        `,
        ]);

        return {
            totalStudents: Number(students[0]?.total ?? 0),
            totalEmployees: Number(employees[0]?.total ?? 0),
            visitsToday: Number(visitsToday[0]?.total ?? 0),
            pendingReports: Number(pending[0]?.total ?? 0),
            visitorsToday: Number(visitors[0]?.total ?? 0),
            dentalToday: Number(dentalToday[0]?.total ?? 0),
            recentVisitsStudents,
            recentVisitsEmployees,
            recentDentalStudents,
            recentDentalEmployees,
            caseSummary,
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
            recentVisitsStudents: [] as VisitRow[],
            recentVisitsEmployees: [] as VisitRow[],
            recentDentalStudents: [] as DentalRow[],
            recentDentalEmployees: [] as DentalRow[],
            caseSummary: [] as CaseSummaryRow[],
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

    return (
        <main className="space-y-8 p-6 md:p-8 ">
            <div>
                <h1 className="text-3xl font-semibold text-[#15664f] ">Dashboard</h1>
                <p className="mt-1 text-gray-700">Welcome back! Here&apos;s what&apos;s happening today.</p>
            </div>

            <section className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${gridCols}`}>
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="min-h-[3rem] text-base leading-6 text-[#15664f]">
                                    {stat.label}
                                </p>
                                <div className="shrink-0 rounded-lg bg-[#dff1ea] p-2.5 text-[#15664f]">
                                    <Icon className="h-6 w-6" strokeWidth={1.8} />
                                </div>
                            </div>
                            <p className="mt-auto pt-2 text-3xl font-semibold text-[#15664f]">
                                {stat.value.toLocaleString("en-US")}
                            </p>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                {/* Recent Clinic Visits (left) + Quick Actions (right), hidden for dentists */}
                {!isDentist && (
                    <div className="grid gap-6 xl:col-span-2 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <VisitTable
                                title="Recent Clinic Visits: Students"
                                nameLabel="Student Name"
                                rows={data.recentVisitsStudents}
                                empty="No student clinic visits recorded yet."
                                listHref={ROUTES.studentVisits}
                                rowHref={ROUTES.studentVisitDetail}
                            />
                            <VisitTable
                                title="Recent Clinic Visits: Employees"
                                nameLabel="Employee Name"
                                rows={data.recentVisitsEmployees}
                                empty="No employee clinic visits recorded yet."
                                listHref={ROUTES.employeeVisits}
                                rowHref={ROUTES.employeeVisitDetail}
                            />
                        </div>
                        <QuickActions role={role} />
                    </div>
                )}

                {/* Case Report Summary (hidden for dentists) */}
                {!isDentist && (
                    <div className="xl:col-span-2">
                        <h2 className="mb-3 text-lg font-semibold text-[#14532D]">Case Report Summary</h2>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            {data.caseSummary.length === 0 ? (
                                <p className="p-8 text-center text-md text-gray-700">No case reports yet.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-700">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Illness</th>
                                            <th className="w-24 px-4 py-3 font-medium">Count</th>
                                            <th className="w-28 px-4 py-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.caseSummary.map((row) => {
                                            const count = Number(row.total);
                                            const level = levelFor(count);
                                            return (
                                                <tr key={row.complaint} className="border-t border-gray-100">
                                                    <td className="px-4 py-3.5 text-gray-900">{row.complaint}</td>
                                                    <td className="px-4 py-3.5 text-gray-900">{count}</td>
                                                    <td className="px-4 py-3.5">
                                                        <span
                                                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${level.className}`}
                                                        >
                                                            {level.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Dental Visits, separated (hidden for doctors) */}
                {!isDoctor && (
                    <div className="grid gap-6 xl:col-span-2 xl:grid-cols-2">
                        <DentalList
                            title="Recent Dental Visits: Students"
                            rows={data.recentDentalStudents}
                            empty="No student dental visits yet."
                        />
                        <DentalList
                            title="Recent Dental Visits: Employees"
                            rows={data.recentDentalEmployees}
                            empty="No employee dental visits yet."
                        />
                    </div>
                )}
            </section>
        </main>
    );
}