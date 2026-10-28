import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import SearchInput from "@/components/shared/search-input";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import { PersonAvatar, listCardClass, listSearchClass, listSelectClass } from "@/components/shared/list-ui";

// All Dental Visits: kapareho ng itsura ng Students / Employees page.

type Row = {
    dental_id: number;
    patient_type: "student" | "employee";
    ref_number: string;
    last_name: string | null;
    first_name: string | null;
    procedure_name: string;
    visit_date: Date;
    avatar: string | null;
    total_count: bigint;
};

const BASE = "/dashboard/dental-visits";
const PAGE_SIZE = 10;
const TYPE_LABELS: Record<string, string> = { student: "Students", employee: "Employees" };

function formatVisitDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

// Student = green, Employee = dilaw
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

export default async function DentalVisitsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; type?: string; procedure?: string; page?: string }>;
}) {
    const session = await getSession();
    if (!session) redirect("/login");

    // Doctors do not handle dental records (same rule as the dashboard).
    const role = String(session.role ?? "").toLowerCase();
    if (role === "doctor") redirect("/dashboard");

    const sp = await searchParams;
    const q = (sp.q ?? "").trim();
    const rawType = (sp.type ?? "").toLowerCase();
    const type = rawType === "student" || rawType === "employee" ? rawType : "all";
    // Procedure filter (hal. Oral prophylaxis, Tooth extraction). Hindi case-sensitive.
    const procedure = (sp.procedure ?? "").trim().slice(0, 255);
    const page = Math.max(1, Number(sp.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const like = `%${q}%`;

    // Mga pagpipilian sa "All Procedures" filter
    const procedureRows = await prisma.$queryRaw<{ value: string }[]>`
      SELECT MIN(TRIM(procedure_name)) AS value
      FROM dental_records
      WHERE archived_at IS NULL AND TRIM(procedure_name) <> ''
      GROUP BY LOWER(TRIM(procedure_name))
      ORDER BY 1
    `;
    const procedures = procedureRows.map((r) => r.value);

    const rows = await prisma.$queryRaw<Row[]>`
      WITH v AS (
        SELECT d.dental_id,
               COALESCE(s.student_number, e.employee_number) AS ref_number,
               COALESCE(s.last_name, e.last_name)            AS last_name,
               COALESCE(s.first_name, e.first_name)          AS first_name,
               COALESCE(s.avatar, e.avatar)                  AS avatar,
               CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
               d.procedure_name,
               d.visit_date
        FROM dental_records d
        LEFT JOIN students s  ON s.student_id  = d.student_id
        LEFT JOIN employees e ON e.employee_id = d.employee_id
        WHERE d.archived_at IS NULL
      )
      SELECT v.*, COUNT(*) OVER () AS total_count
      FROM v
      WHERE (CAST(${type} AS TEXT) = 'all' OR v.patient_type = CAST(${type} AS TEXT))
        AND (CAST(${procedure} AS TEXT) = '' OR LOWER(TRIM(v.procedure_name)) = LOWER(CAST(${procedure} AS TEXT)))
        AND (CAST(${q} AS TEXT) = ''
             OR (COALESCE(v.first_name, '') || ' ' || COALESCE(v.last_name, '')) ILIKE CAST(${like} AS TEXT)
             OR v.procedure_name ILIKE CAST(${like} AS TEXT)
             OR v.ref_number ILIKE CAST(${like} AS TEXT))
      ORDER BY v.visit_date DESC, v.dental_id DESC
      LIMIT CAST(${PAGE_SIZE} AS INT) OFFSET CAST(${offset} AS INT)
    `;

    const total = Number(rows[0]?.total_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const pageHref = (p: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (type !== "all") params.set("type", type);
        if (procedure) params.set("procedure", procedure);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    if (page > totalPages && total > 0) redirect(pageHref(totalPages));

    const viewHref = (r: Row) =>
        r.patient_type === "employee"
            ? `/dashboard/dental-records?employee=${encodeURIComponent(r.ref_number)}&view=history`
            : `/dashboard/dental-records?student=${encodeURIComponent(r.ref_number)}&view=history`;

    const getName = (r: Row) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unknown";

    // "⋮" menu ng bawat row
    const actions = (r: Row): RowAction[] => [
        {
            label: "View Dental Record",
            href: viewHref(r),
            title: "View dental record",
            message: `Open the dental record of ${getName(r)}? This contains confidential medical information and your access will be recorded.`,
            confirmLabel: "View",
            icon: "view",
        },
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="space-y-2">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">All Dental Visits</h1>
                    <p className="mt-1 text-sm text-gray-600">All dental visits of students and employees, newest first.</p>
                </div>
            </div>

            <section className={listCardClass}>
                {/* Filter sa kaliwa, search sa kanan */}
                <form
                    method="get"
                    action={BASE}
                    className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[12rem_12rem_minmax(0,1fr)]"
                >
                    <AutoSubmitSelect
                        name="type"
                        defaultValue={type === "all" ? "" : type}
                        options={["student", "employee"]}
                        labels={TYPE_LABELS}
                        allLabel="All Types"
                        className={listSelectClass}
                    />
                    <AutoSubmitSelect
                        name="procedure"
                        defaultValue={procedures.find((p) => p.toLowerCase() === procedure.toLowerCase()) ?? ""}
                        options={procedures}
                        allLabel="All Procedures"
                        className={listSelectClass}
                    />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Search name, ID, or procedure..."
                            suppressHydrationWarning
                            className={listSearchClass}
                        />
                    </div>
                </form>

                {rows.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No dental visits found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {rows.map((r) => (
                                <li
                                    key={`${r.patient_type}-${r.dental_id}`}
                                    className="flex items-start gap-3 rounded-xl border border-[#e4ede8] p-3"
                                >
                                    <PersonAvatar src={r.avatar} first={r.first_name} last={r.last_name} type={r.patient_type} />
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold text-gray-900">{getName(r)}</p>
                                        <p className="text-sm text-gray-600">{r.ref_number}</p>
                                        <p className="mt-1 break-words text-sm capitalize text-gray-600">
                                            {r.procedure_name} · {formatVisitDate(r.visit_date)}
                                        </p>
                                        <div className="mt-2">
                                            <TypeBadge type={r.patient_type} />
                                        </div>
                                    </div>
                                    <RowActionMenu actions={actions(r)} />
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-[#e4ede8] bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">ID Number</th>
                                        <th className="px-5 py-3 font-semibold">Name</th>
                                        <th className="px-5 py-3 font-semibold">Procedure</th>
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Visit Date</th>
                                        <th className="px-5 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={`${r.patient_type}-${r.dental_id}`} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{r.ref_number}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <PersonAvatar src={r.avatar} first={r.first_name} last={r.last_name} type={r.patient_type} />
                                                    <span className="font-medium text-gray-900">{getName(r)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 capitalize text-gray-600">{r.procedure_name}</td>
                                            <td className="px-5 py-3">
                                                <TypeBadge type={r.patient_type} />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{formatVisitDate(r.visit_date)}</td>
                                            <td className="px-5 py-3 text-center">
                                                <RowActionMenu actions={actions(r)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} hrefFor={pageHref} />
            </section>
        </main>
    );
}