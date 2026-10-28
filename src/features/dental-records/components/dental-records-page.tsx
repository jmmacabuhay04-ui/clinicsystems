import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDental } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import DentalRecordDetail from "@/features/dental-records/components/dental-record-detail";
import SearchInput from "@/components/shared/search-input";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import { PersonAvatar, addButtonClass, listCardClass, listSearchClass, listSelectClass } from "@/components/shared/list-ui";

const BASE = "/dashboard/dental-records";
const PAGE_SIZE = 10;

type DentalRow = {
    dental_id: number;
    visit_date: Date;
    procedure_name: string;
    tooth: string | null;
    dentist_name: string | null;
    status: string;
    patient_type: "student" | "employee";
    patient_number: string;
    last_name: string;
    first_name: string;
    avatar: string | null;
};

type Props = {
    searchParams: Promise<{
        q?: string;
        type?: string;
        status?: string;
        page?: string;
        student?: string;
        employee?: string;
        view?: string;
        record?: string;
        from?: string;
    }>;
};

// Mga status sa database at ang label na ipinapakita.
const STATUS_LABELS: Record<string, string> = { completed: "Completed", "follow-up": "Follow-up" };
const LABEL_TO_STATUS: Record<string, string> = { Completed: "completed", "Follow-up": "follow-up" };

function fmt(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
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

function StatusBadge({ status }: { status: string }) {
    const followUp = status === "follow-up";
    return (
        <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ${followUp ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
                }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${followUp ? "bg-amber-500" : "bg-green-500"}`} />
            {followUp ? "Follow-up" : "Completed"}
        </span>
    );
}

export default async function DentalRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageDental(session.role);
    const isDentist = String(session.role ?? "").toLowerCase() === "dentist";

    const params = await searchParams;

    // Galing sa dashboard "View": ang isang dental record lang ang ipapakita.
    const recordId = parseInt(params.record ?? "", 10);
    // Saan babalik ang "Back": listahan, health record ng pasyente (Dental Records tab), o dashboard
    const fromKind = params.student ? "student" : params.employee ? "employee" : "";
    const fromNumber = (params.student || params.employee || "").trim();
    const recordBackHref =
        params.from === "list"
            ? BASE
            : params.from === "patient" && fromKind && fromNumber
                ? `/dashboard/${fromKind}-health-records?${fromKind}=${encodeURIComponent(fromNumber)}&tab=dental`
                : "/dashboard";

    if (recordId > 0) {
        // Galing sa listahang ito: babalik sa Dental Records, hindi sa dashboard.
        return (
            <DentalRecordDetail
                dentalId={recordId}
                canEdit={canEdit}
                backHref={recordBackHref}
            />
        );
    }

    const q = (params.q ?? "").trim();
    const like = `%${q}%`;
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    // ?student=<no> or ?employee=<no> with ?view=history (from the dashboard
    // View button) shows only that one person's dental records.
    const historyKind = params.student ? "student" : params.employee ? "employee" : "";
    const patientNumber = (params.student || params.employee || "").trim();
    const historyOnly = (params.view ?? "") === "history" && patientNumber !== "";

    // Filters ng listahan
    const type = patientNumber ? historyKind : params.type === "student" || params.type === "employee" ? params.type : "";
    const status = LABEL_TO_STATUS[params.status ?? ""] ?? (STATUS_LABELS[params.status ?? ""] ? params.status! : "");

    const hrefWith = (changes: Record<string, string>) => {
        const current: Record<string, string> = { q, type, status: status ? STATUS_LABELS[status] : "", ...changes };
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(current)) if (v) sp.set(k, v);
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };
    const hrefFor = (p: number) =>
        historyOnly
            ? `${BASE}?${historyKind}=${encodeURIComponent(patientNumber)}&view=history${p > 1 ? `&page=${p}` : ""}`
            : hrefWith({ page: p > 1 ? String(p) : "" });

    const [records, counts] = await Promise.all([
        prisma.$queryRaw<DentalRow[]>`
    SELECT d.dental_id, d.visit_date, d.procedure_name, d.tooth, d.dentist_name, d.status,
           CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COALESCE(s.student_number, e.employee_number) AS patient_number,
           COALESCE(s.last_name, e.last_name) AS last_name,
           COALESCE(s.first_name, e.first_name) AS first_name,
           COALESCE(s.avatar, e.avatar) AS avatar
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.archived_at IS NULL
      AND (${q}::text = ''
        OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
        OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
        OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
        OR d.procedure_name ILIKE ${like})
      AND (${patientNumber}::text = ''
        OR COALESCE(s.student_number, e.employee_number) = ${patientNumber})
      AND (${type}::text = ''
        OR CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END = ${type})
      AND (${status}::text = '' OR d.status = ${status})
    ORDER BY d.visit_date DESC, d.dental_id DESC
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
  `,
        // Bilang bawat uri (para sa tabs), ayon sa search at status.
        prisma.$queryRaw<{ patient_type: string; count: number }[]>`
    SELECT CASE WHEN d.employee_id IS NOT NULL THEN 'employee' ELSE 'student' END AS patient_type,
           COUNT(*)::int AS count
    FROM dental_records d
    LEFT JOIN students s ON s.student_id = d.student_id
    LEFT JOIN employees e ON e.employee_id = d.employee_id
    WHERE d.archived_at IS NULL
      AND (${q}::text = ''
        OR COALESCE(s.student_number, e.employee_number) ILIKE ${like}
        OR COALESCE(s.last_name, e.last_name) ILIKE ${like}
        OR COALESCE(s.first_name, e.first_name) ILIKE ${like}
        OR d.procedure_name ILIKE ${like})
      AND (${patientNumber}::text = ''
        OR COALESCE(s.student_number, e.employee_number) = ${patientNumber})
      AND (${status}::text = '' OR d.status = ${status})
    GROUP BY 1
  `,
    ]);

    const countOf = (t: string) => counts.find((c) => c.patient_type === t)?.count ?? 0;
    const allCount = countOf("student") + countOf("employee");
    const total = type ? countOf(type) : allCount;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) redirect(hrefFor(totalPages));

    // Pagpipilian sa "All Types" filter (may bilang)
    const TYPE_OPTIONS: Record<string, string> = {
        student: `Students (${countOf("student")})`,
        employee: `Employees (${countOf("employee")})`,
    };

    const patientName = records[0]
        ? `${records[0].first_name} ${records[0].last_name} (${records[0].patient_number})`
        : patientNumber;

    // Mga pagpipilian sa "⋮" menu ng bawat row
    const actions = (d: DentalRow): RowAction[] => [
        {
            label: "View Dental Record",
            // Walang access ang Dentist sa clinic health records, kaya ang dental record mismo ang bubuksan
            href: isDentist
                ? `${BASE}?record=${d.dental_id}&from=list`
                : `/dashboard/${d.patient_type}-health-records?${d.patient_type}=${encodeURIComponent(d.patient_number)}&tab=dental`,
            title: "View dental record",
            message: `Open the dental record of ${d.first_name} ${d.last_name}? This contains confidential medical information and your access will be recorded.`,
            confirmLabel: "View",
            icon: "view",
        },
        ...(canEdit
            ? [
                {
                    label: "Edit Record",
                    href: `${BASE}/edit?record=${d.dental_id}&back=${encodeURIComponent(hrefFor(page))}`,
                    title: "Edit dental record",
                    message: `Edit the dental record (${d.procedure_name}) of ${d.first_name} ${d.last_name}?`,
                    confirmLabel: "Edit",
                    icon: "edit" as const,
                },
            ]
            : []),
    ];

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Dental Records</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        {historyOnly ? `Dental history of ${patientName}.` : "Manage and view dental procedures of students and employees."}
                    </p>
                </div>

                {canEdit ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add dental record"
                        message="Add a new dental record for a student or employee?"
                        confirmLabel="Continue"
                        icon={<Plus className="h-5 w-5" />}
                        className={addButtonClass}
                    >
                        <Plus className="h-4 w-4" />
                        Add Record
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

            {historyOnly && (
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to dashboard
                </Link>
            )}

            <section className={listCardClass}>
                {!historyOnly && (
                    // Filters sa kaliwa, search sa kanan
                    <form
                        method="get"
                        action={BASE}
                        className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[12rem_12rem_minmax(0,1fr)]"
                    >
                        <AutoSubmitSelect
                            name="type"
                            defaultValue={type}
                            options={["student", "employee"]}
                            labels={TYPE_OPTIONS}
                            allLabel={`All Types (${allCount})`}
                            className={listSelectClass}
                        />
                        <AutoSubmitSelect
                            name="status"
                            defaultValue={status ? STATUS_LABELS[status] : ""}
                            options={Object.values(STATUS_LABELS)}
                            allLabel="All Statuses"
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
                )}

                {records.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No dental records found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {records.map((d) => (
                                <li key={d.dental_id} className="flex items-start gap-3 rounded-xl border border-[#e4ede8] p-3">
                                    <PersonAvatar src={d.avatar} first={d.first_name} last={d.last_name} type={d.patient_type} />
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold text-gray-900">
                                            {d.first_name} {d.last_name}
                                        </p>
                                        <p className="text-sm text-gray-600">{d.patient_number}</p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {d.procedure_name} · {fmt(d.visit_date)}
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <TypeBadge type={d.patient_type} />
                                            <StatusBadge status={d.status} />
                                        </div>
                                    </div>
                                    <RowActionMenu actions={actions(d)} />
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
                                        <th className="px-5 py-3 font-semibold">Type</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Visit Date</th>
                                        <th className="px-5 py-3 font-semibold">Procedure</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((d) => (
                                        <tr key={d.dental_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{d.patient_number}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <PersonAvatar src={d.avatar} first={d.first_name} last={d.last_name} type={d.patient_type} />
                                                    <span className="font-medium text-gray-900">
                                                        {d.first_name} {d.last_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <TypeBadge type={d.patient_type} />
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{fmt(d.visit_date)}</td>
                                            <td className="px-5 py-3 text-gray-600">{d.procedure_name}</td>
                                            <td className="px-5 py-3">
                                                <StatusBadge status={d.status} />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <RowActionMenu actions={actions(d)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} hrefFor={hrefFor} />
            </section>
        </main>
    );
}