import { redirect } from "next/navigation";
import { Activity, FileText, Stethoscope, UserCheck, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

async function loadDashboard() {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    try {
        const [students, visitsToday, pending, recentVisits, caseSummary, visitors, dentalToday, recentDental] =
            await Promise.all([
                prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*) AS total FROM students WHERE archived_at IS NULL
        `,
                prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*) AS total FROM health_records
          WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
        `,
                prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*) AS total FROM health_case_reports
          WHERE archived_at IS NULL AND status = 'pending'
        `,
                prisma.$queryRaw<VisitRow[]>`
          SELECT r.record_id, s.last_name, s.first_name, r.complaint, r.visit_date
          FROM health_records r
          JOIN students s ON s.student_id = r.student_id
          WHERE r.archived_at IS NULL
          ORDER BY r.visit_date DESC, r.record_id DESC
          LIMIT 5
        `,
                prisma.$queryRaw<CaseSummaryRow[]>`
          SELECT complaint, COUNT(*) AS total
          FROM health_case_reports
          WHERE archived_at IS NULL
          GROUP BY complaint
          ORDER BY total DESC, complaint
          LIMIT 6
        `,
                prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*) AS total FROM visitor_logs
          WHERE archived_at IS NULL AND visit_date = CAST(${today} AS DATE)
        `,
                prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*) AS total FROM dental_records
          WHERE archived_at IS NULL AND CAST(visit_date AS DATE) = CAST(${today} AS DATE)
        `,
                prisma.$queryRaw<DentalRow[]>`
          SELECT d.dental_id,
                 COALESCE(s.last_name, e.last_name)   AS last_name,
                 COALESCE(s.first_name, e.first_name) AS first_name,
                 CASE WHEN d.student_id IS NOT NULL THEN 'Student' ELSE 'Employee' END AS patient_type,
                 d.procedure_name,
                 d.visit_date
          FROM dental_records d
          LEFT JOIN students s  ON s.student_id  = d.student_id
          LEFT JOIN employees e ON e.employee_id = d.employee_id
          WHERE d.archived_at IS NULL
          ORDER BY d.visit_date DESC, d.dental_id DESC
          LIMIT 5
        `,
            ]);

        return {
            totalStudents: Number(students[0]?.total ?? 0),
            visitsToday: Number(visitsToday[0]?.total ?? 0),
            pendingReports: Number(pending[0]?.total ?? 0),
            visitorsToday: Number(visitors[0]?.total ?? 0),
            dentalToday: Number(dentalToday[0]?.total ?? 0),
            recentVisits,
            recentDental,
            caseSummary,
        };
    } catch (err) {
        console.error("Dashboard error:", err);
        return {
            totalStudents: 0,
            visitsToday: 0,
            pendingReports: 0,
            visitorsToday: 0,
            dentalToday: 0,
            recentVisits: [] as VisitRow[],
            recentDental: [] as DentalRow[],
            caseSummary: [] as CaseSummaryRow[],
        };
    }
}

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const data = await loadDashboard();

    // Doctors do not handle dental records, so dental info is hidden for them.
    const isDoctor = session.role === "doctor";

    const stats: { label: string; value: number; icon: LucideIcon }[] = [
        { label: "Total Students", value: data.totalStudents, icon: Users },
        { label: "Clinic Visits Today", value: data.visitsToday, icon: Activity },
        ...(isDoctor
            ? []
            : [{ label: "Dental Visits Today", value: data.dentalToday, icon: Stethoscope }]),
        { label: "Pending Reports", value: data.pendingReports, icon: FileText },
        { label: "Visitors Today", value: data.visitorsToday, icon: UserCheck },
    ];

    return (
        <main className="space-y-8 p-6 md:p-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-gray-600">Welcome back! Here&apos;s what&apos;s happening today.</p>
            </div>

            <section
                className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isDoctor ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}
            >
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                            <div>
                                <p className="text-lg text-[#15664f]">{stat.label}</p>
                                <p className="mt-2 text-3xl font-semibold text-[#15664f]">
                                    {stat.value.toLocaleString("en-US")}
                                </p>
                            </div>
                            <div className="rounded-lg bg-[#dff1ea] p-2.5 text-[#15664f]">
                                <Icon className="h-6 w-6" strokeWidth={1.8} />
                            </div>
                        </div>
                    );
                })}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
                {/* Recent Clinic Visits */}
                <div>
                    <h2 className="mb-3 text-lg font-semibold text-[#14532D]">Recent Clinic Visits</h2>
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        {data.recentVisits.length === 0 ? (
                            <p className="p-8 text-center text-md text-gray-700">No clinic visits recorded yet.</p>
                        ) : (
                            data.recentVisits.map((visit, index) => {
                                const name = `${visit.first_name} ${visit.last_name}`;
                                return (
                                    <div
                                        key={visit.record_id}
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
                                                <p className="truncate text-sm text-gray-500">{visit.complaint}</p>
                                            </div>
                                        </div>
                                        <p className="shrink-0 text-sm text-gray-500">
                                            {formatVisitDate(visit.visit_date)}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Case Report Summary */}
                <div>
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

                {/* Recent Dental Visits (hidden for doctors) */}
                {!isDoctor && (
                    <div>
                        <h2 className="mb-3 text-lg font-semibold text-[#14532D]">Recent Dental Visits</h2>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            {data.recentDental.length === 0 ? (
                                <p className="p-8 text-center text-md text-gray-700">No dental visits recorded yet.</p>
                            ) : (
                                data.recentDental.map((d, index) => {
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
                                                    <p className="truncate font-medium text-gray-900">
                                                        {name}
                                                        <span
                                                            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${d.patient_type === "Student"
                                                                ? "bg-[#dff1ea] text-[#15664f]"
                                                                : "bg-amber-100 text-amber-800"
                                                                }`}
                                                        >
                                                            {d.patient_type}
                                                        </span>
                                                    </p>
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
                )}
            </section>
        </main>
    );
}