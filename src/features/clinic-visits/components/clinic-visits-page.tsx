import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import ConfirmLink from "@/components/shared/confirm-link";
import SearchInput from "@/components/shared/search-input";

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
        timeZone: "Asia/Manila",
    });
}

function PatientAvatar({ name, type }: { name: string; type: "student" | "employee" }) {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();

    return (
        <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${type === "employee" ? "bg-amber-400 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {initials}
        </span>
    );
}

function TypeBadge({ type }: { type: "student" | "employee" }) {
    return (
        <span
            className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${type === "employee" ? "bg-amber-300 text-gray-900" : "bg-[#15664f] text-white"
                }`}
        >
            {type === "employee" ? "Employee" : "Student"}
        </span>
    );
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

    const confirmMessage = (name: string) =>
        `Open the health record of ${name}? This contains confidential medical information and your access will be recorded.`;

    return (
        <main className="min-w-0 space-y-4 p-4 pb-8 md:p-6">
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
                        <div>
                            <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">All Clinic Visits</h1>
                            <p className="text-sm text-gray-600">{total.toLocaleString("en-US")} total records</p>
                        </div>
                    </div>
                </div>

                {/* Right side: Search (full width sa mobile) */}
                <form method="get" className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
                    <SearchInput
                        name="q"
                        defaultValue={q}
                        placeholder="Search name, ID or complaint..."
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base placeholder:text-sm md:w-64 md:py-1.5 md:text-sm"
                    />
                    <select
                        name="type"
                        defaultValue={type}
                        className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-base md:flex-none md:py-1.5 md:text-sm"
                    >
                        <option value="all">All types</option>
                        <option value="student">Student</option>
                        <option value="employee">Employee</option>
                    </select>
                    <button
                        type="submit"
                        className="rounded-md bg-[#15664f] px-4 py-2 text-sm font-medium text-white hover:bg-[#124f3d] md:py-1.5"
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
                    <p className="p-6 text-center text-sm text-gray-600">No clinic visits found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list (walang horizontal scroll) */}
                        <ul className="space-y-2 md:hidden">
                            {rows.map((r) => {
                                const name = `${r.first_name} ${r.last_name}`;
                                return (
                                    <li
                                        key={`${r.patient_type}-${r.record_id}`}
                                        className="rounded-lg border border-gray-100 p-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <PatientAvatar name={name} type={r.patient_type} />
                                            <div className="min-w-0 flex-1">
                                                <p className="break-words text-sm font-medium text-gray-900">{name}</p>
                                                <p className="text-sm text-gray-600">ID: {r.ref_number}</p>
                                                <p className="mt-1 break-words text-sm text-gray-600">
                                                    <span className="text-gray-600">Complaint: </span>
                                                    {r.complaint}
                                                </p>
                                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                    <TypeBadge type={r.patient_type} />
                                                    <span className="text-sm text-gray-600">
                                                        {formatVisitDate(r.visit_date)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ConfirmLink
                                            href={viewHref(r)}
                                            title="View health record"
                                            message={confirmMessage(name)}
                                            className="mt-3 block w-full rounded-md bg-[#15664f] px-3 py-2 text-center text-sm font-medium text-white hover:bg-[#124f3d]"
                                        >
                                            View
                                        </ConfirmLink>
                                    </li>
                                );
                            })}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
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
                                        return (
                                            <tr
                                                key={`${r.patient_type}-${r.record_id}`}
                                                className="border-t border-gray-100"
                                            >
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                                                    {r.ref_number}
                                                </td>
                                                <td className="px-3 py-2 font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <PatientAvatar name={name} type={r.patient_type} />
                                                        <span>{name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600">{r.complaint}</td>
                                                <td className="px-3 py-2">
                                                    <TypeBadge type={r.patient_type} />
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                                                    {formatVisitDate(r.visit_date)}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <ConfirmLink
                                                        href={viewHref(r)}
                                                        title="View health record"
                                                        message={confirmMessage(name)}
                                                        className="inline-block rounded-md bg-[#15664f] px-3 py-1 text-sm font-medium text-white hover:bg-[#124f3d]"
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
                    </>
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
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-[#15664f] hover:bg-gray-50"
                                >
                                    Previous
                                </Link>
                            )}
                            {page < totalPages && (
                                <Link
                                    href={pageHref(page + 1)}
                                    className="rounded-md border border-gray-300 px-3 py-1.5 text-[#15664f] hover:bg-gray-50"
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