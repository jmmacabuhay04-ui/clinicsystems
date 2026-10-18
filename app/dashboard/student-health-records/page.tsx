import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, Pencil, Plus, Search, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ConfirmButton from "@/components/confirm-button";
import { archiveRecord } from "./record-actions";
import { archiveStudent } from "../students/student-actions";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/confirm-link";
import { logAccess } from "@/lib/access-log";
type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    contact_number: string | null;
    email: string | null;
};

type RecordRow = {
    record_id: number;
    visit_date: Date;
    complaint: string;
    action_taken: string | null;
    attending_staff: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    heart_rate: number | null;
    blood_pressure: string | null;
    temperature: number | null;
};

type CaseRow = {
    case_id: number;
    case_number: string;
    complaint: string;
    report_date: Date;
    staff_name: string | null;
    status: string;
    notes: string | null;
};

// One row of the merged Visit History table. A clinic visit and a health
// case report are stored in different tables, so they are normalised here
// into a single shape before being sorted together by date.
type VisitItem = {
    key: string;
    kind: "visit" | "case";
    id: number;
    date: Date;
    complaint: string;
    detail: string | null;
    staff: string | null;
    caseNumber: string | null;
    status: string | null;
};

type Props = {
    searchParams: Promise<{ q?: string; student?: string; view?: string; page?: string }>;
};

const BASE = "/dashboard/student-health-records";
const CASES = "/dashboard/health-case-reports";
const PAGE_SIZE = 10;

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    referred: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
};

// Mobile: bawat row ay card, at ang data-label ang nagsisilbing label ng bawat field.
// md pataas: normal na table.
const tr =
    "mb-3 block rounded-lg border border-gray-200 py-2 md:mb-0 md:table-row md:rounded-none md:border-0 md:border-t md:border-gray-100 md:py-0";
const td =
    "flex items-start justify-between gap-3 px-4 py-1.5 text-right before:shrink-0 before:text-left before:text-xs before:font-semibold before:uppercase before:text-gray-500 before:content-[attr(data-label)] md:table-cell md:py-3 md:text-left md:before:hidden";

function formatDate(date: Date | null, month: "short" | "long" = "short") {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month,
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function show(value: number | string | null | undefined, unit = "") {
    return value === null || value === undefined || value === "" ? "—" : `${value}${unit}`;
}

async function countStudents(q: string): Promise<number> {
    if (!q) {
        const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM students WHERE archived_at IS NULL
    `;
        return Number(rows[0]?.count ?? 0);
    }

    const like = `%${q}%`;
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count
    FROM students
    WHERE archived_at IS NULL
      AND (student_number ILIKE ${like}
        OR last_name ILIKE ${like}
        OR first_name ILIKE ${like}
        OR middle_name ILIKE ${like}
        OR (first_name || ' ' || last_name) ILIKE ${like}
        OR (last_name || ', ' || first_name) ILIKE ${like})
  `;
    return Number(rows[0]?.count ?? 0);
}

async function searchStudents(q: string, limit: number, offset: number) {
    if (!q) {
        return prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, date_of_birth, gender, contact_number, email
      FROM students
      WHERE archived_at IS NULL
      ORDER BY student_number ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    }

    const like = `%${q}%`;
    return prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program, date_of_birth, gender, contact_number, email
    FROM students
    WHERE archived_at IS NULL
      AND (student_number ILIKE ${like}
        OR last_name ILIKE ${like}
        OR first_name ILIKE ${like}
        OR middle_name ILIKE ${like}
        OR (first_name || ' ' || last_name) ILIKE ${like}
        OR (last_name || ', ' || first_name) ILIKE ${like})
    ORDER BY last_name, first_name
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export default async function StudentHealthRecordsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const canEdit = canManageRecords(session.role);
    const canAddStudent = canManageStudents(session.role);

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const selectedNumber = (params.student ?? "").trim();
    // ?view=history (from the dashboard View button) shows only the Visit History table.
    const historyOnly = (params.view ?? "") === "history";
    const requestedPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    let selected: StudentRow | undefined;
    let results: StudentRow[] = [];
    let totalResults = 0;
    let totalPages = 1;
    let currentPage = 1;

    if (selectedNumber) {
        const rows = await prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, date_of_birth, gender, contact_number, email
      FROM students
      WHERE student_number = ${selectedNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        selected = rows[0];
    } else {
        totalResults = await countStudents(q);
        totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
        currentPage = Math.min(requestedPage, totalPages);
        results = await searchStudents(q, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE);
    }

    const pageHref = (p: number) => {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };

    // Page numbers with ellipsis, e.g. 1 … 4 5 6 … 12
    const pageItems: (number | "…")[] = [];
    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
            pageItems.push(p);
        } else if (pageItems[pageItems.length - 1] !== "…") {
            pageItems.push("…");
        }
    }

    const records = selected
        ? await prisma.$queryRaw<RecordRow[]>`
        SELECT record_id, visit_date, complaint, action_taken, attending_staff,
               height_cm, weight_kg, heart_rate, blood_pressure, temperature
        FROM health_records
        WHERE student_id = ${selected.student_id} AND archived_at IS NULL
        ORDER BY visit_date DESC, record_id DESC
      `
        : [];

    const cases = selected
        ? await prisma.$queryRaw<CaseRow[]>`
        SELECT case_id, case_number, complaint, report_date, staff_name, status, notes
        FROM health_case_reports
        WHERE student_id = ${selected.student_id} AND archived_at IS NULL
        ORDER BY report_date DESC, case_id DESC
      `
        : [];

    // --- Audit log (RA 10173) ---
    // Naitatala kung sino ang nagbukas ng partikular na health record.
    // Hindi nagta-log kapag listahan pa lang ang tinitingnan.
    const actor = {
        userId: Number((session as any).userId ?? (session as any).id ?? 0),
        role: session.role,
        name: String(
            (session as any).fullName ??
            (session as any).full_name ??
            (session as any).name ??
            (session as any).username ??
            ""
        ),
    };

    if (selected) {
        await logAccess(
            actor,
            "student_health_record",
            selected.student_id,
            "view",
            `${selected.last_name}, ${selected.first_name} (${selected.student_number})`
        );
    }

    // Clinic visits and case reports shown as one timeline, newest first.
    const visits: VisitItem[] = [
        ...records.map((r) => ({
            key: `visit-${r.record_id}`,
            kind: "visit" as const,
            id: r.record_id,
            date: r.visit_date,
            complaint: r.complaint,
            detail: r.action_taken,
            staff: r.attending_staff,
            caseNumber: null,
            status: null,
        })),
        ...cases.map((c) => ({
            key: `case-${c.case_id}`,
            kind: "case" as const,
            id: c.case_id,
            date: c.report_date,
            complaint: c.complaint,
            detail: c.notes,
            staff: c.staff_name,
            caseNumber: c.case_number,
            status: c.status,
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Vital signs are only recorded on clinic visits, not on case reports.
    const latestVitals = records.find(
        (r) =>
            r.height_cm !== null ||
            r.weight_kg !== null ||
            r.heart_rate !== null ||
            r.blood_pressure !== null ||
            r.temperature !== null
    );

    const vitals = [
        { label: "Height", value: show(latestVitals?.height_cm, " cm") },
        { label: "Weight", value: show(latestVitals?.weight_kg, " kg") },
        { label: "Heart Rate", value: show(latestVitals?.heart_rate, " bpm") },
        { label: "Blood Pressure", value: show(latestVitals?.blood_pressure) },
        { label: "Temperature", value: show(latestVitals?.temperature, "°C") },
        { label: "Last Updated", value: records[0] ? formatDate(records[0].visit_date) : "—" },
    ];

    const profile = selected
        ? [
            { label: "Grade/Level", value: show(selected.grade_level) },
            { label: "Program", value: show(selected.program) },
            { label: "Student Number", value: selected.student_number },
            { label: "Last Name", value: selected.last_name },
            { label: "First Name", value: selected.first_name },
            { label: "Middle Name", value: show(selected.middle_name) },
            { label: "Date of Birth", value: formatDate(selected.date_of_birth, "long") },
            { label: "Gender", value: show(selected.gender) },
            { label: "Contact Number", value: show(selected.contact_number) },
            { label: "Email Address", value: show(selected.email) },
        ]
        : [];

    const addHref = selected
        ? `${BASE}/new?student=${encodeURIComponent(selected.student_number)}`
        : `${BASE}/new`;

    const backHref = historyOnly
        ? "/dashboard"
        : (() => {
            const sp = new URLSearchParams();
            if (q) sp.set("q", q);
            if (requestedPage > 1) sp.set("page", String(requestedPage));
            const qs = sp.toString();
            return qs ? `${BASE}?${qs}` : BASE;
        })();

    return (
        <main className="min-w-0 space-y-6 p-4 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Student Health Records</h1>
                {canEdit ? (
                    <div className="flex flex-wrap items-center gap-3">

                        <ConfirmLink
                            href={addHref}
                            title="Add visit record"
                            message={
                                selected
                                    ? `Add a new visit record for ${selected.first_name} ${selected.last_name} (${selected.student_number})?`
                                    : "Add a new clinic visit record?"
                            }
                            confirmLabel="Continue"
                            icon={<Plus className="h-5 w-5" />}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                        >
                            <Plus className="h-4 w-4" />
                            Add Record
                        </ConfirmLink>
                    </div>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                )}
            </div>

            {!selected && (
                <form method="get" action={BASE} className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        name="q"
                        defaultValue={q}
                        autoComplete="off"
                        placeholder="Search by student number or name..."
                        suppressHydrationWarning
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                    />
                </form>
            )}

            {selectedNumber && !selected && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    No active student found with number {selectedNumber}. It may have been archived.
                </div>
            )}

            {!selected && !selectedNumber && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

                    {results.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-700">No students found.</p>
                    ) : (
                        <>
                            <div className="p-3 md:overflow-x-auto md:p-0">
                                <table className="block w-full text-left text-sm md:table">
                                    <thead className="hidden bg-[#EEEEEE] text-[#15664f] md:table-header-group">
                                        <tr>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Grade/Level</th>
                                            <th className="px-4 py-3 font-medium">Program</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Last Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">First Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Middle Name</th>
                                            <th className="whitespace-nowrap px-4 py-3 font-medium">Contact Number</th>
                                            <th className="px-4 py-3 font-medium">Email</th>
                                            <th className="px-4 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="block md:table-row-group">
                                        {results.map((s) => (
                                            <tr key={s.student_id} className={tr}>
                                                <td data-label="Grade/Level" className={`${td} text-gray-600`}>
                                                    {show(s.grade_level)}
                                                </td>
                                                <td data-label="Program" className={`${td} text-gray-600`}>
                                                    {show(s.program)}
                                                </td>
                                                <td data-label="Student No." className={`${td} font-medium text-gray-900`}>
                                                    {s.student_number}
                                                </td>
                                                <td data-label="Last Name" className={`${td} text-gray-900`}>
                                                    {s.last_name}
                                                </td>
                                                <td data-label="First Name" className={`${td} text-gray-900`}>
                                                    {s.first_name}
                                                </td>
                                                <td data-label="Middle Name" className={`${td} text-gray-900`}>
                                                    {show(s.middle_name)}
                                                </td>
                                                <td data-label="Contact" className={`${td} text-gray-700 md:whitespace-nowrap`}>
                                                    {show(s.contact_number)}
                                                </td>
                                                <td data-label="Email" className={`${td} break-all text-gray-700`}>
                                                    {show(s.email)}
                                                </td>
                                                <td data-label="Actions" className={`${td} md:whitespace-nowrap`}>
                                                    <div className="flex items-center gap-3">
                                                        <ConfirmLink
                                                            href={`${BASE}?student=${encodeURIComponent(s.student_number)}${q ? `&q=${encodeURIComponent(q)}` : ""}${currentPage > 1 ? `&page=${currentPage}` : ""}`}
                                                            title="View health record"
                                                            message={`Open the health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information and your access will be recorded.`}
                                                            className="font-medium text-[#15664f] hover:underline"
                                                        >
                                                            View record
                                                        </ConfirmLink>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                                <p>
                                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                                    {(currentPage - 1) * PAGE_SIZE + results.length} of {totalResults}
                                </p>

                                {totalPages > 1 && (
                                    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                                        <nav className="flex flex-wrap items-center gap-1" aria-label="Pagination">
                                            {currentPage > 1 ? (
                                                <Link
                                                    href={pageHref(currentPage - 1)}
                                                    className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-[#15664f] hover:bg-[#eef6f2]"
                                                >
                                                    Previous
                                                </Link>
                                            ) : (
                                                <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-400">
                                                    Previous
                                                </span>
                                            )}

                                            {pageItems.map((item, i) =>
                                                item === "…" ? (
                                                    <span key={`gap-${i}`} className="px-2 text-gray-400">
                                                        …
                                                    </span>
                                                ) : item === currentPage ? (
                                                    <span
                                                        key={item}
                                                        aria-current="page"
                                                        className="rounded-lg bg-[#15664f] px-3 py-1.5 font-semibold text-white"
                                                    >
                                                        {item}
                                                    </span>
                                                ) : (
                                                    <Link
                                                        key={item}
                                                        href={pageHref(item)}
                                                        className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-[#eef6f2]"
                                                    >
                                                        {item}
                                                    </Link>
                                                )
                                            )}

                                            {currentPage < totalPages ? (
                                                <Link
                                                    href={pageHref(currentPage + 1)}
                                                    className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-[#15664f] hover:bg-[#eef6f2]"
                                                >
                                                    Next
                                                </Link>
                                            ) : (
                                                <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-400">
                                                    Next
                                                </span>
                                            )}
                                        </nav>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </section>
            )}

            {selected && (
                <>
                    {selectedNumber && (
                        <Link
                            href={backHref}
                            className="inline-flex items-center gap-1 text-sm font-medium text-[#15664f] hover:underline"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {historyOnly ? "Back to dashboard" : "Back to student list"}
                        </Link>
                    )}

                    {!historyOnly && (
                        <>
                            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
                                <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-6">
                                    {profile.map((item) => (
                                        <div key={item.label} className="min-w-0">
                                            <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
                                            <p className="mt-1 break-words font-semibold text-gray-900">{item.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {canAddStudent && (
                                    <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
                                        <ConfirmLink
                                            href={`/dashboard/students/edit?student=${encodeURIComponent(selected.student_number)}`}
                                            title="Edit student details"
                                            message={`Edit the details of ${selected.first_name} ${selected.last_name} (${selected.student_number})? Changes will replace the current information.`}
                                            confirmLabel="Edit"
                                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#15664f] bg-white px-4 text-sm font-medium text-[#15664f] hover:bg-[#eef6f2]"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit student details
                                        </ConfirmLink>

                                        <form action={archiveStudent}>
                                            <input type="hidden" name="studentId" value={selected.student_id} />
                                            <ConfirmButton
                                                title="Archive student"
                                                confirmLabel="Archive"
                                                message={`Archive ${selected.last_name}, ${selected.first_name} (${selected.student_number})? This student will be hidden from Student Health Records and moved to Archive Records. You can restore them later.`}
                                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-medium text-amber-800 hover:bg-amber-100"
                                            >
                                                <Archive className="h-4 w-4" />
                                                Archive this student
                                            </ConfirmButton>
                                        </form>
                                    </div>
                                )}
                            </section>

                            <section>
                                <h2 className="mb-3 text-lg font-semibold text-gray-900">Vital Signs</h2>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
                                    {vitals.map((v) => (
                                        <div key={v.label} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                            <p className="text-sm text-gray-500">{v.label}</p>
                                            <p className="mt-2 break-words text-lg font-semibold text-gray-900 md:text-xl">
                                                {v.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-lg font-semibold text-[#15664f]">Visit History</h2>
                            <p className="text-sm text-gray-900">
                                {historyOnly
                                    ? `${selected.last_name}, ${selected.first_name} (${selected.student_number})`
                                    : "Clinic visits and health case reports combined, newest first."}
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            {visits.length === 0 ? (
                                <p className="p-8 text-center text-sm text-gray-500">
                                    No clinic visits or case reports recorded yet.
                                </p>
                            ) : (
                                <div className="p-3 md:overflow-x-auto md:p-0">
                                    <table className="block w-full text-left text-sm md:table">
                                        <thead className="hidden bg-[#EEEEEE] text-[#15664f] md:table-header-group">
                                            <tr>
                                                <th className="whitespace-nowrap px-4 py-3 font-medium">Date</th>
                                                <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Complaint</th>
                                                <th className="px-4 py-3 font-medium">Action Taken / Notes</th>
                                                <th className="px-4 py-3 font-medium">Attending Staff</th>
                                                {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="block md:table-row-group">
                                            {visits.map((v) => (
                                                <tr key={v.key} className={tr}>
                                                    <td data-label="Date" className={`${td} text-gray-900 md:whitespace-nowrap`}>
                                                        {formatDate(v.date)}
                                                    </td>
                                                    <td data-label="Type" className={`${td} md:whitespace-nowrap`}>
                                                        {v.kind === "visit" ? (
                                                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                                                Clinic Visit
                                                            </span>
                                                        ) : (
                                                            <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
                                                                <span className="rounded-full bg-[#eef6f2] px-2.5 py-0.5 text-xs font-medium text-[#15664f]">
                                                                    Case {v.caseNumber}
                                                                </span>
                                                                <span
                                                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[v.status ?? ""] ??
                                                                        "bg-gray-100 text-gray-700"
                                                                        }`}
                                                                >
                                                                    {v.status}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td data-label="Complaint" className={`${td} break-words text-gray-900`}>
                                                        {v.complaint}
                                                    </td>
                                                    <td data-label="Notes" className={`${td} break-words text-gray-900`}>
                                                        {v.detail ?? "—"}
                                                    </td>
                                                    <td data-label="Staff" className={`${td} text-gray-900`}>
                                                        {v.staff ?? "—"}
                                                    </td>
                                                    {canEdit && (
                                                        <td data-label="Actions" className={`${td} md:whitespace-nowrap`}>
                                                            <div className="flex flex-wrap items-center justify-end gap-3 md:justify-start">
                                                                {v.kind === "visit" ? (
                                                                    <>
                                                                        <ConfirmLink
                                                                            href={`${BASE}/edit?record=${v.id}`}
                                                                            title="Edit visit record"
                                                                            message={`Edit this visit (${formatDate(v.date)} - ${v.complaint})?`}
                                                                            confirmLabel="Edit"
                                                                            className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                            Edit
                                                                        </ConfirmLink>
                                                                        <form action={archiveRecord}>
                                                                            <input type="hidden" name="recordId" value={v.id} />
                                                                            <ConfirmButton
                                                                                title="Archive visit record"
                                                                                confirmLabel="Archive"
                                                                                message={`Archive this visit (${formatDate(v.date)} - ${v.complaint})? It will move to Archive Records. You can restore it later.`}
                                                                                className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                                                                            >
                                                                                <Archive className="h-3.5 w-3.5" />
                                                                                Archive
                                                                            </ConfirmButton>
                                                                        </form>
                                                                    </>
                                                                ) : (
                                                                    <ConfirmLink
                                                                        href={`${CASES}/edit?case=${v.id}`}
                                                                        title="Open case report"
                                                                        message={`Open case ${v.caseNumber} (${v.complaint})? You will be taken to Health Case Reports.`}
                                                                        confirmLabel="Open"
                                                                        className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                        Open case
                                                                    </ConfirmLink>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}