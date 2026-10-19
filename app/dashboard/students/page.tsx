import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/confirm-link";
import { Pencil, Plus, Search } from "lucide-react";

const BASE = "/dashboard/students";
const HEALTH_BASE = "/dashboard/student-health-records";
const PAGE_SIZE = 10;

type Row = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
};

type Props = {
    searchParams: Promise<{ q?: string; saved?: string; page?: string }>;
};

// [1] ... [4] [5] [6] ... [20]
function pageList(current: number, last: number): (number | "...")[] {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    const pages = new Set([1, last, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
    const out: (number | "...")[] = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - sorted[i - 1] > 1) out.push("...");
        out.push(p);
    });
    return out;
}

export default async function StudentsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;
    const q = (params.q ?? "").trim();
    const saved = params.saved ?? "";
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    const canAdd = canManageRecords(session.role);
    const canEdit = canManageStudents(session.role);
    const like = `%${q}%`;
    const offset = (page - 1) * PAGE_SIZE;

    const [students, count] = await Promise.all([
        prisma.$queryRaw<Row[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program
      FROM students
      WHERE archived_at IS NULL
        AND (
          ${q}::text = ''
          OR student_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
          OR middle_name ILIKE ${like}
          OR (first_name || ' ' || last_name) ILIKE ${like}
          OR (last_name || ', ' || first_name) ILIKE ${like}
        )
      ORDER BY student_number ASC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
        prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM students
      WHERE archived_at IS NULL
        AND (
          ${q}::text = ''
          OR student_number ILIKE ${like}
          OR last_name ILIKE ${like}
          OR first_name ILIKE ${like}
          OR middle_name ILIKE ${like}
          OR (first_name || ' ' || last_name) ILIKE ${like}
          OR (last_name || ', ' || first_name) ILIKE ${like}
        )
    `,
    ]);

    const total = count[0]?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) {
        redirect(`${BASE}?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${totalPages}`);
    }

    const pageHref = (p: number) => `${BASE}?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;
    const editHref = (s: Row) => `${BASE}/edit?student=${encodeURIComponent(s.student_number)}`;
    const recordsHref = (s: Row) =>
        `${HEALTH_BASE}?student=${encodeURIComponent(s.student_number)}`;
    const fullName = (s: Row) =>
        `${s.last_name}, ${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ""}`;

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                <h1 className="text-2xl font-semibold text-[#15664f] md:text-3xl">Students</h1>
                {canAdd ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add a new student?"
                        message="You will be taken to the form to create a new student record."
                        confirmLabel="Continue"
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Student
                    </ConfirmLink>
                ) : !canEdit ? (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
                        View only
                    </span>
                ) : null}
            </div>

            {saved && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Student {saved} was saved.
                </p>
            )}

            <form method="get" action={BASE} className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    name="q"
                    defaultValue={q}
                    autoComplete="off"
                    placeholder="Search by student number or name"
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                />
            </form>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {students.length === 0 ? (
                    <p className="p-6 text-center text-sm text-gray-500 md:p-8">No students found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 p-3 md:hidden">
                            {students.map((s) => (
                                <li key={s.student_id} className="rounded-lg border border-gray-100 p-3">
                                    <p className="break-words text-sm font-semibold text-gray-900">{fullName(s)}</p>
                                    <p className="text-xs text-gray-500">{s.student_number}</p>
                                    <dl className="mt-2 space-y-1">
                                        <div className="flex gap-2 text-sm">
                                            <dt className="w-24 shrink-0 text-gray-500">Grade/Level</dt>
                                            <dd className="min-w-0 flex-1 break-words text-gray-900">{s.grade_level ?? "—"}</dd>
                                        </div>
                                        <div className="flex gap-2 text-sm">
                                            <dt className="w-24 shrink-0 text-gray-500">Program</dt>
                                            <dd className="min-w-0 flex-1 break-words text-gray-900">{s.program ?? "—"}</dd>
                                        </div>
                                    </dl>
                                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-sm">
                                        {canEdit && (
                                            <ConfirmLink
                                                href={editHref(s)}
                                                title="Edit student details"
                                                message={`Edit the details of ${s.first_name} ${s.last_name} (${s.student_number})?`}
                                                confirmLabel="Edit"
                                                className="inline-flex items-center gap-1 py-1 font-medium text-[#15664f] hover:underline"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit
                                            </ConfirmLink>
                                        )}
                                        <ConfirmLink
                                            href={recordsHref(s)}
                                            title="View health record"
                                            message={`Open the health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information and your access will be recorded.`}
                                            className="inline-flex items-center gap-1 py-1 font-medium text-[#15664f] hover:underline"
                                        >
                                            Health Record
                                        </ConfirmLink>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#EEEEEE] text-[#15664f]">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Grade/Level</th>
                                        <th className="px-4 py-3 font-medium">Program</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => (
                                        <tr key={s.student_id} className="border-t border-gray-100">
                                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                                {s.student_number}
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">{fullName(s)}</td>
                                            <td className="px-4 py-3 text-gray-600">{s.grade_level ?? "—"}</td>
                                            <td className="px-4 py-3 text-gray-600">{s.program ?? "—"}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <div className="flex items-center gap-4">
                                                    {canEdit && (
                                                        <ConfirmLink
                                                            href={editHref(s)}
                                                            title="Edit student details"
                                                            message={`Edit the details of ${s.first_name} ${s.last_name} (${s.student_number})?`}
                                                            confirmLabel="Edit"
                                                            className="font-medium text-[#15664f] hover:underline"
                                                        >
                                                            Edit
                                                        </ConfirmLink>
                                                    )}
                                                    <ConfirmLink
                                                        href={recordsHref(s)}
                                                        title="View health record"
                                                        message={`Open the health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information and your access will be recorded.`}
                                                        className="font-medium text-[#15664f] hover:underline"
                                                    >
                                                        Health Record
                                                    </ConfirmLink>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-100 px-4 py-3 empty:hidden sm:justify-end">
                            {totalPages > 1 && (
                                <nav className="flex flex-wrap items-center justify-center gap-1 sm:justify-end" aria-label="Pagination">
                                    {page > 1 ? (
                                        <Link
                                            href={pageHref(page - 1)}
                                            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-[#15664f] hover:bg-[#eef6f2] sm:py-1.5"
                                        >
                                            Previous
                                        </Link>
                                    ) : (
                                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-gray-400 sm:py-1.5">
                                            Previous
                                        </span>
                                    )}

                                    {pageList(page, totalPages).map((p, i) =>
                                        p === "..." ? (
                                            <span key={`gap-${i}`} className="px-2 text-gray-400">
                                                …
                                            </span>
                                        ) : p === page ? (
                                            <span
                                                key={p}
                                                aria-current="page"
                                                className="rounded-lg bg-[#15664f] px-3 py-1.5 font-semibold text-white"
                                            >
                                                {p}
                                            </span>
                                        ) : (
                                            <Link
                                                key={p}
                                                href={pageHref(p)}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-[#eef6f2]"
                                            >
                                                {p}
                                            </Link>
                                        )
                                    )}

                                    {page < totalPages ? (
                                        <Link
                                            href={pageHref(page + 1)}
                                            className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-[#15664f] hover:bg-[#eef6f2] sm:py-1.5"
                                        >
                                            Next
                                        </Link>
                                    ) : (
                                        <span className="rounded-lg border border-gray-200 px-3 py-2 text-gray-400 sm:py-1.5">
                                            Next
                                        </span>
                                    )}
                                </nav>
                            )}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}