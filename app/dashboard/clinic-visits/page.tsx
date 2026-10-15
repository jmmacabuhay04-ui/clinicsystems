import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ConfirmLink from "@/components/confirm-link";

type Row = {
    record_id: number;
    patient_type: "student" | "employee";
    ref_number: string;
    last_name: string;
    first_name: string;
    complaint: string;
    visit_date: Date;
    total_count: bigint;
};

const PAGE_SIZE = 15;

function formatVisitDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default async function ClinicVisitsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; type?: string; page?: string }>;
}) {
    const session = await getSession();
    if (!session) redirect("/login");

    // Dentists do not see clinic records (same rule as the dashboard).
    const role = String(session.role ?? "").toLowerCase();
    if (role === "dentist") redirect("/dashboard");

    const sp = await searchParams;
    const q = (sp.q ?? "").trim();
    const type = sp.type === "student" || sp.type === "employee" ? sp.type : "all";
    const page = Math.max(1, Number(sp.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const like = `%${q}%`;

    const rows = await prisma.$queryRaw<Row[]>`
      WITH v AS (
        SELECT r.record_id, 'student'::text AS patient_type,
               s.student_number AS ref_number, s.last_name, s.first_name,
               r.complaint, r.visit_date
        FROM health_records r
        JOIN students s ON s.student_id = r.student_id
        WHERE r.archived_at IS NULL
        UNION ALL
        SELECT r.record_id, 'employee'::text AS patient_type,
               e.employee_number AS ref_number, e.last_name, e.first_name,
               r.complaint, r.visit_date
        FROM employee_health_records r
        JOIN employees e ON e.employee_id = r.employee_id
        WHERE r.archived_at IS NULL
      )
      SELECT v.*, COUNT(*) OVER () AS total_count
      FROM v
      WHERE (CAST(${type} AS TEXT) = 'all' OR v.patient_type = CAST(${type} AS TEXT))
        AND (CAST(${q} AS TEXT) = ''
             OR (v.first_name || ' ' || v.last_name) ILIKE CAST(${like} AS TEXT)
             OR v.complaint ILIKE CAST(${like} AS TEXT)
             OR v.ref_number ILIKE CAST(${like} AS TEXT))
      ORDER BY (CASE WHEN v.patient_type = 'employee' THEN 1 ELSE 0 END) ASC, v.visit_date DESC, v.ref_number ASC, v.record_id ASC
      LIMIT CAST(${PAGE_SIZE} AS INT) OFFSET CAST(${offset} AS INT)
    `;

    const total = Number(rows[0]?.total_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const pageHref = (p: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (type !== "all") params.set("type", type);
        params.set("page", String(p));
        return `/dashboard/clinic-visits?${params.toString()}`;
    };

    const viewHref = (r: Row) =>
        r.patient_type === "employee"
            ? `/dashboard/employee-health-records?employee=${encodeURIComponent(r.ref_number)}&view=history`
            : `/dashboard/student-health-records?student=${encodeURIComponent(r.ref_number)}&view=history`;

    return (
        <main className="min-w-0 space-y-4 p-4 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                {/* Left side: Back to Dashboard + title */}
                <div className="space-y-2">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-[#dff1ea] p-1.5 text-[#15664f]">
                            <Stethoscope className="h-5 w-5" strokeWidth={1.8} />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-[#14532D]">All Clinic Visits</h1>
                            <p className="text-xs text-gray-600">{total.toLocaleString("en-US")} total records</p>
                        </div>
                    </div>
                </div>

                {/* Right side: Search */}
                <form method="get" className="flex flex-wrap items-center justify-end gap-2">
                    <input
                        name="q"
                        defaultValue={q}
                        placeholder="Search name, ID or complaint..."
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm sm:w-64"
                    />
                    <select
                        name="type"
                        defaultValue={type}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                    >
                        <option value="all">All types</option>
                        <option value="student">Student</option>
                        <option value="employee">Employee</option>
                    </select>
                    <button
                        type="submit"
                        className="rounded-md bg-[#15664f] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#124f3d]"
                    >
                        Search
                    </button>
                    {(q || type !== "all") && (
                        <Link href="/dashboard/clinic-visits" className="text-sm text-gray-600 hover:underline">
                            Clear
                        </Link>
                    )}
                </form>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                {rows.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-700">No clinic visits found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#EEEEEE] text-[#15664f]">
                                <tr>
                                    <th className="whitespace-nowrap px-3 py-2 font-medium">ID</th>
                                    <th className="px-3 py-2 font-medium">Name</th>
                                    <th className="px-3 py-2 font-medium">Complaint</th>
                                    <th className="px-3 py-2 font-medium">Type</th>
                                    <th className="whitespace-nowrap px-3 py-2 font-medium">Date</th>
                                    <th className="px-3 py-2 text-center font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const name = `${r.first_name} ${r.last_name}`;
                                    const isEmp = r.patient_type === "employee";
                                    return (
                                        <tr key={`${r.patient_type}-${r.record_id}`} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">{r.ref_number}</td>
                                            <td className="px-3 py-2 font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        aria-hidden="true"
                                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${isEmp ? "bg-amber-400 text-gray-900" : "bg-[#15664f] text-white"
                                                            }`}
                                                    >
                                                        {name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                                                    </span>
                                                    <span>{name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">{r.complaint}</td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${isEmp ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                                                        }`}
                                                >
                                                    {isEmp ? "Employee" : "Student"}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                                                {formatVisitDate(r.visit_date)}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <ConfirmLink
                                                    href={viewHref(r)}
                                                    title="View health record"
                                                    message={`Open the health record of ${name}? This contains confidential medical information and your access will be recorded.`}
                                                    className="inline-block rounded-md bg-[#15664f] px-3 py-1 text-xs font-medium text-white hover:bg-[#124f3d]"
                                                >
                                                    View
                                                </ConfirmLink>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Link
                                    href={pageHref(page - 1)}
                                    className="rounded-md border border-gray-300 px-3 py-1 text-[#15664f] hover:bg-gray-50"
                                >
                                    Previous
                                </Link>
                            )}
                            {page < totalPages && (
                                <Link
                                    href={pageHref(page + 1)}
                                    className="rounded-md border border-gray-300 px-3 py-1 text-[#15664f] hover:bg-gray-50"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}