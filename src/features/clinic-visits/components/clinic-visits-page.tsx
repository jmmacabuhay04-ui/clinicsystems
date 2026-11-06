import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canViewDental, canViewHealthRecords } from "@/lib/permissions";
import SearchInput from "@/components/shared/search-input";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import { PersonAvatar, listCardClass, listSearchClass, listSelectClass } from "@/components/shared/list-ui";

// "View All" ng Today's Visits sa Dashboard: LAHAT ng na-record NGAYONG ARAW (oras ng Manila)
//   Clinic = clinic visit, Dental = dental record, Case = case report mula sa New Case Report

type Row = {
    kind: "clinic" | "dental" | "case";
    item_id: number;
    patient_type: "student" | "employee";
    ref_number: string;
    last_name: string | null;
    first_name: string | null;
    reason: string;
    recorded_time: string;
    avatar: string | null;
    total_count: bigint;
};

const BASE = "/dashboard/clinic-visits";
const PAGE_SIZE = 20;
const TYPE_LABELS: Record<string, string> = { student: "Students", employee: "Employees" };
const KIND_LABELS: Record<string, string> = { clinic: "Clinic", dental: "Dental", case: "Case" };

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

// Clinic = green, Dental = dilaw, Case = blue (kapareho ng Dashboard)
function KindBadge({ kind }: { kind: Row["kind"] }) {
    const tone =
        kind === "dental" ? "bg-amber-100 text-amber-800" : kind === "case" ? "bg-blue-50 text-blue-700" : "bg-[#e3f1e9] text-[#15664f]";
    return (
        <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${tone}`}>
            {KIND_LABELS[kind]}
        </span>
    );
}

export default async function ClinicVisitsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; type?: string; kind?: string; page?: string }>;
}) {
    const session = await getSession();
    if (!session) redirect("/login");
    // Health records: Admin, Nurse at Doctor lang (ang Dentist ay may sariling Dental Visits)
    if (!canViewHealthRecords(session.role)) redirect("/dashboard");
    const role = String(session.role ?? "").toLowerCase();
    if (role === "dentist") redirect("/dashboard/dental-visits");
    // Dental: Admin at Nurse lang (hindi ang Doctor), gaya ng Dashboard
    const showDental = canViewDental(session.role) && role !== "doctor";

    const sp = await searchParams;
    const q = (sp.q ?? "").trim();
    const rawType = (sp.type ?? "").toLowerCase();
    const type = rawType === "student" || rawType === "employee" ? rawType : "all";
    const rawKind = (sp.kind ?? "").toLowerCase();
    const kind = rawKind === "clinic" || rawKind === "case" || (rawKind === "dental" && showDental) ? rawKind : "all";
    const page = Math.max(1, Number(sp.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const like = `%${q}%`;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());

    const rows = await prisma.$queryRaw<Row[]>`
      WITH v AS (
        SELECT 'clinic'::text AS kind, r.record_id AS item_id, 'student'::text AS patient_type,
               s.student_number AS ref_number, s.last_name, s.first_name,
               r.complaint AS reason, r.created_at, s.avatar
        FROM health_records r
        JOIN students s ON s.student_id = r.student_id
        WHERE r.archived_at IS NULL
        UNION ALL
        SELECT 'clinic', r.record_id, 'employee',
               e.employee_number, e.last_name, e.first_name,
               r.complaint, r.created_at, e.avatar
        FROM employee_health_records r
        JOIN employees e ON e.employee_id = r.employee_id
        WHERE r.archived_at IS NULL
        UNION ALL
        SELECT 'dental', d.dental_id,
               CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END,
               COALESCE(s.student_number, e.employee_number), COALESCE(s.last_name, e.last_name),
               COALESCE(s.first_name, e.first_name), d.procedure_name, d.created_at,
               COALESCE(s.avatar, e.avatar)
        FROM dental_records d
        LEFT JOIN students s ON s.student_id = d.student_id
        LEFT JOIN employees e ON e.employee_id = d.employee_id
        WHERE d.archived_at IS NULL AND ${showDental}
        UNION ALL
        -- Case report na ginawa sa New Case Report (hindi galing sa Clinic Visit)
        SELECT 'case', c.case_id,
               CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END,
               COALESCE(s.student_number, e.employee_number), COALESCE(s.last_name, e.last_name),
               COALESCE(s.first_name, e.first_name), c.complaint, c.created_at,
               COALESCE(s.avatar, e.avatar)
        FROM health_case_reports c
        LEFT JOIN students s ON s.student_id = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.archived_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM health_records h
                          WHERE c.student_id IS NOT NULL AND h.student_id = c.student_id
                            AND h.visit_date = c.report_date AND h.archived_at IS NULL
                            AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
          AND NOT EXISTS (SELECT 1 FROM employee_health_records h
                          WHERE c.employee_id IS NOT NULL AND h.employee_id = c.employee_id
                            AND h.visit_date = c.report_date AND h.archived_at IS NULL
                            AND LOWER(TRIM(h.complaint)) = LOWER(TRIM(c.complaint)))
      ),
      t AS (
        -- Oras ng pagka-record sa Manila (tama kahit UTC o Manila ang database)
        SELECT v.*, ((v.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila') AS recorded_at
        FROM v
      )
      SELECT t.kind, t.item_id, t.patient_type, t.ref_number, t.last_name, t.first_name, t.reason, t.avatar,
             to_char(t.recorded_at, 'HH12:MI AM') AS recorded_time,
             COUNT(*) OVER () AS total_count
      FROM t
      WHERE t.recorded_at::date = CAST(${today} AS DATE)
        AND (CAST(${type} AS TEXT) = 'all' OR t.patient_type = CAST(${type} AS TEXT))
        AND (CAST(${kind} AS TEXT) = 'all' OR t.kind = CAST(${kind} AS TEXT))
        AND (CAST(${q} AS TEXT) = ''
             OR (t.first_name || ' ' || t.last_name) ILIKE CAST(${like} AS TEXT)
             OR t.ref_number ILIKE CAST(${like} AS TEXT))
      ORDER BY t.recorded_at DESC
      LIMIT CAST(${PAGE_SIZE} AS INT) OFFSET CAST(${offset} AS INT)
    `;

    const total = Number(rows[0]?.total_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const pageHref = (p: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (type !== "all") params.set("type", type);
        if (kind !== "all") params.set("kind", kind);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    if (page > totalPages && total > 0) redirect(pageHref(totalPages));

    const getName = (r: Row) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Unknown";

    // Saan bubukas ang View (kapareho ng Today's Visits sa Dashboard)
    const viewHref = (r: Row) => {
        if (r.kind === "case") return `/dashboard/health-case-reports?case=${r.item_id}`;
        if (r.kind === "dental") {
            return `/dashboard/dental-records?${r.patient_type}=${encodeURIComponent(r.ref_number)}&view=history&record=${r.item_id}`;
        }
        return r.patient_type === "employee"
            ? `/dashboard/employee-health-records?employee=${encodeURIComponent(r.ref_number)}&view=history&record=${r.item_id}`
            : `/dashboard/student-health-records?student=${encodeURIComponent(r.ref_number)}&view=history&record=${r.item_id}`;
    };

    const actions = (r: Row): RowAction[] => [
        {
            label: r.kind === "case" ? "View Case Report" : r.kind === "dental" ? "View Dental Record" : "View Visit Record",
            href: viewHref(r),
            title: r.kind === "case" ? "View case report" : r.kind === "dental" ? "View dental record" : "View visit record",
            message: `Open the record of ${getName(r)}? This contains confidential medical information and your access will be recorded.`,
            confirmLabel: "View",
            icon: "view",
        },
    ];

    const longToday = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="space-y-2">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Today&apos;s Visits</h1>
                    <p className="mt-1 text-sm text-gray-600">Everything recorded today, {longToday}. Newest first.</p>
                </div>
            </div>

            <section className={listCardClass}>
                <form
                    method="get"
                    action={BASE}
                    className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[11rem_11rem_minmax(0,1fr)]"
                >
                    <AutoSubmitSelect
                        name="kind"
                        defaultValue={kind === "all" ? "" : kind}
                        options={showDental ? ["clinic", "dental", "case"] : ["clinic", "case"]}
                        labels={KIND_LABELS}
                        allLabel="All Records"
                        className={listSelectClass}
                    />
                    <AutoSubmitSelect
                        name="type"
                        defaultValue={type === "all" ? "" : type}
                        options={["student", "employee"]}
                        labels={TYPE_LABELS}
                        allLabel="All Types"
                        className={listSelectClass}
                    />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Name or ID..."
                            suppressHydrationWarning
                            className={listSearchClass}
                        />
                    </div>
                </form>

                {rows.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">Nothing recorded today yet.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {rows.map((r) => (
                                <li key={`${r.kind}-${r.patient_type}-${r.item_id}`} className="flex items-start gap-3 rounded-xl border border-[#e4ede8] p-3">
                                    <PersonAvatar src={r.avatar} first={r.first_name} last={r.last_name} type={r.patient_type} />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="break-words text-sm font-semibold text-gray-900">{getName(r)}</p>
                                            <KindBadge kind={r.kind} />
                                        </div>
                                        <p className="text-sm text-gray-600">{r.ref_number}</p>
                                        <p className="mt-1 break-words text-sm capitalize text-gray-600">
                                            {r.reason} · {r.recorded_time}
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
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Time</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">ID Number</th>
                                        <th className="px-5 py-3 font-semibold">Name</th>
                                        <th className="px-5 py-3 font-semibold">Reason / Procedure</th>
                                        <th className="px-5 py-3 font-semibold">Record</th>
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="px-5 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={`${r.kind}-${r.patient_type}-${r.item_id}`} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{r.recorded_time}</td>
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{r.ref_number}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <PersonAvatar src={r.avatar} first={r.first_name} last={r.last_name} type={r.patient_type} />
                                                    <span className="font-medium text-gray-900">{getName(r)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 capitalize text-gray-600">{r.reason}</td>
                                            <td className="px-5 py-3">
                                                <KindBadge kind={r.kind} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <TypeBadge type={r.patient_type} />
                                            </td>
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