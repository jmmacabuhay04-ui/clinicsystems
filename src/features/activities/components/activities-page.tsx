import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Search, Stethoscope } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canViewDental, canViewHealthRecords } from "@/lib/permissions";
import SearchInput from "@/components/shared/search-input";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import AutoSubmitInput from "@/components/shared/auto-submit-input";
import ListPagination from "@/components/shared/list-pagination";
import { listCardClass, listSearchClass, listSelectClass } from "@/components/shared/list-ui";

// "View All" ng Recent Activities: LAHAT ng na-record (clinic visit, dental, case report),
// pinakabago muna, kasama ang petsa at oras ng pagka-save at ang staff.

type Row = {
    kind: "clinic" | "dental" | "report";
    item_id: number;
    patient_type: "student" | "employee";
    ref_number: string | null;
    name: string | null;
    detail: string | null;
    staff: string | null;
    rec_date: string;
    rec_clock: string;
    total_count: bigint;
};

const BASE = "/dashboard/activities";
const PAGE_SIZE = 20;
const KIND_LABELS: Record<string, string> = { clinic: "New Clinic Visit", dental: "New Dental Visit", report: "Case Report Created" };

function ToothIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d="M7 3C5 3 3.5 4.7 3.5 7C3.5 9 4.3 10.4 4.9 12C5.5 13.7 5.5 15.5 6 17.2C6.4 18.7 7.2 21 8.5 21C10 21 10.1 18.4 10.6 16.7C10.8 16 11.2 15.5 12 15.5C12.8 15.5 13.2 16 13.4 16.7C13.9 18.4 14 21 15.5 21C16.8 21 17.6 18.7 18 17.2C18.5 15.5 18.5 13.7 19.1 12C19.7 10.4 20.5 9 20.5 7C20.5 4.7 19 3 17 3C15.3 3 14.4 4 12 4C9.6 4 8.7 3 7 3Z" />
        </svg>
    );
}

// Kapareho ng icon at kulay sa Recent Activities ng Dashboard
function ActivityLabel({ kind }: { kind: Row["kind"] }) {
    const meta = {
        clinic: { Icon: Stethoscope, tile: "bg-[#eef6f2] text-[#15664f]" },
        dental: { Icon: ToothIcon, tile: "bg-cyan-50 text-cyan-700" },
        report: { Icon: ClipboardList, tile: "bg-amber-100 text-amber-700" },
    }[kind];
    return (
        <span className="flex items-center gap-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.tile}`}>
                <meta.Icon className="h-4 w-4" />
            </span>
            <span className="whitespace-nowrap text-gray-900">{KIND_LABELS[kind]}</span>
        </span>
    );
}

function cleanDate(v: string | undefined) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? (v as string) : "";
}

function formatDay(ymd: string) {
    return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default async function ActivitiesPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; kind?: string; from?: string; to?: string; page?: string }>;
}) {
    const session = await getSession();
    if (!session) redirect("/login");
    const role = String(session.role ?? "").toLowerCase();
    // Kapareho ng Dashboard: Doctor = walang dental; Dentist = dental lang
    const showHealth = canViewHealthRecords(session.role);
    const showDental = canViewDental(session.role) && role !== "doctor";
    if (!showHealth && !showDental) redirect("/dashboard");

    const sp = await searchParams;
    const q = (sp.q ?? "").trim();
    const allowedKinds = [...(showHealth ? ["clinic"] : []), ...(showDental ? ["dental"] : []), ...(showHealth ? ["report"] : [])];
    const rawKind = (sp.kind ?? "").toLowerCase();
    const kind = allowedKinds.includes(rawKind) ? rawKind : "all";
    const from = cleanDate(sp.from);
    const to = cleanDate(sp.to);
    const page = Math.max(1, Number(sp.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;
    const like = `%${q}%`;

    const rows = await prisma.$queryRaw<Row[]>`
      WITH v AS (
        SELECT 'clinic'::text AS kind, r.record_id AS item_id, 'student'::text AS patient_type,
               s.student_number AS ref_number, TRIM(s.first_name || ' ' || s.last_name) AS name,
               r.complaint AS detail, r.attending_staff AS staff, r.created_at
        FROM health_records r
        JOIN students s ON s.student_id = r.student_id
        WHERE r.archived_at IS NULL AND ${showHealth}
        UNION ALL
        SELECT 'clinic', r.record_id, 'employee',
               e.employee_number, TRIM(e.first_name || ' ' || e.last_name),
               r.complaint, r.attending_staff, r.created_at
        FROM employee_health_records r
        JOIN employees e ON e.employee_id = r.employee_id
        WHERE r.archived_at IS NULL AND ${showHealth}
        UNION ALL
        SELECT 'dental', d.dental_id,
               CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END,
               COALESCE(s.student_number, e.employee_number),
               TRIM(COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)),
               d.procedure_name, d.dentist_name, d.created_at
        FROM dental_records d
        LEFT JOIN students s ON s.student_id = d.student_id
        LEFT JOIN employees e ON e.employee_id = d.employee_id
        WHERE d.archived_at IS NULL AND ${showDental}
        UNION ALL
        -- Case report na ginawa sa New Case Report lang (ang galing sa Clinic Visit ay nasa "New Clinic Visit" na)
        SELECT 'report', c.case_id,
               CASE WHEN c.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END,
               COALESCE(s.student_number, e.employee_number),
               TRIM(COALESCE(s.first_name, e.first_name) || ' ' || COALESCE(s.last_name, e.last_name)),
               c.complaint, c.staff_name, c.created_at
        FROM health_case_reports c
        LEFT JOIN students s ON s.student_id = c.student_id
        LEFT JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.archived_at IS NULL AND ${showHealth}
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
        -- Oras ng pagka-save sa Manila (tama kahit UTC o Manila ang database)
        SELECT v.*, ((v.created_at AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'Asia/Manila') AS rec_at
        FROM v
      )
      SELECT t.kind, t.item_id, t.patient_type, t.ref_number, t.name, t.detail, t.staff,
             to_char(t.rec_at, 'YYYY-MM-DD') AS rec_date,
             to_char(t.rec_at, 'FMHH12:MI AM') AS rec_clock,
             COUNT(*) OVER () AS total_count
      FROM t
      WHERE (CAST(${kind} AS TEXT) = 'all' OR t.kind = CAST(${kind} AS TEXT))
        AND (CAST(${from} AS TEXT) = '' OR t.rec_at::date >= CAST(NULLIF(CAST(${from} AS TEXT), '') AS DATE))
        AND (CAST(${to} AS TEXT) = '' OR t.rec_at::date <= CAST(NULLIF(CAST(${to} AS TEXT), '') AS DATE))
        AND (CAST(${q} AS TEXT) = ''
             OR t.name ILIKE CAST(${like} AS TEXT)
             OR t.ref_number ILIKE CAST(${like} AS TEXT)
             OR t.staff ILIKE CAST(${like} AS TEXT))
      ORDER BY t.rec_at DESC
      LIMIT CAST(${PAGE_SIZE} AS INT) OFFSET CAST(${offset} AS INT)
    `;

    const total = Number(rows[0]?.total_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const pageHref = (p: number) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (kind !== "all") params.set("kind", kind);
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    if (page > totalPages && total > 0) redirect(pageHref(totalPages));

    const dateField =
        "h-11 w-full rounded-xl border border-[#dcebe3] bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <div className="space-y-2">
                <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">All Activities</h1>
                    <p className="mt-1 text-sm text-gray-600">Every record saved in the clinic, newest first.</p>
                </div>
            </div>

            <section className={listCardClass}>
                <form
                    method="get"
                    action={BASE}
                    className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[13rem_10rem_10rem_minmax(0,1fr)]"
                >
                    <AutoSubmitSelect
                        name="kind"
                        defaultValue={kind === "all" ? "" : kind}
                        options={allowedKinds}
                        labels={KIND_LABELS}
                        allLabel="All Activities"
                        className={listSelectClass}
                    />
                    <AutoSubmitInput type="date" name="from" defaultValue={from} aria-label="From date" className={dateField} />
                    <AutoSubmitInput type="date" name="to" defaultValue={to} aria-label="To date" className={dateField} />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={q}
                            autoComplete="off"
                            placeholder="Name, ID or staff..."
                            suppressHydrationWarning
                            className={listSearchClass}
                        />
                    </div>
                </form>

                {rows.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No activities found.</p>
                ) : (
                    <>
                        {/* MOBILE */}
                        <ul className="divide-y divide-gray-100 border-t border-gray-100 md:hidden">
                            {rows.map((r) => (
                                <li key={`${r.kind}-${r.patient_type}-${r.item_id}`} className="space-y-1.5 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <ActivityLabel kind={r.kind} />
                                        <span className="shrink-0 text-sm text-gray-600">{r.rec_clock}</span>
                                    </div>
                                    <p className="break-words text-sm text-gray-900">
                                        <span className="font-medium">{r.name || "Unknown"}</span>
                                        {r.detail ? <span className="capitalize text-gray-600"> – {r.detail}</span> : null}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {formatDay(r.rec_date)} · {r.staff || "—"}
                                    </p>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-[#e4ede8] bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Date</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Time</th>
                                        <th className="px-5 py-3 font-semibold">Activity</th>
                                        <th className="px-5 py-3 font-semibold">Details</th>
                                        <th className="px-5 py-3 font-semibold">Staff</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={`${r.kind}-${r.patient_type}-${r.item_id}`} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{formatDay(r.rec_date)}</td>
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{r.rec_clock}</td>
                                            <td className="px-5 py-3">
                                                <ActivityLabel kind={r.kind} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="font-medium text-gray-900">{r.name || "Unknown"}</span>
                                                {r.detail ? <span className="capitalize text-gray-600"> – {r.detail}</span> : null}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{r.staff || "—"}</td>
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