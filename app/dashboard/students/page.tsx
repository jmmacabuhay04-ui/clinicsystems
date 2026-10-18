import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/confirm-link";

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
        return prisma.$queryRaw<Row[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program
      FROM students
      WHERE archived_at IS NULL
      ORDER BY student_number ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    }

    const like = `%${q}%`;
    return prisma.$queryRaw<Row[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program
    FROM students
    WHERE archived_at IS NULL
      AND (student_number ILIKE ${like}
        OR last_name ILIKE ${like}
        OR first_name ILIKE ${like}
        OR middle_name ILIKE ${like}
        OR (first_name || ' ' || last_name) ILIKE ${like}
        OR (last_name || ', ' || first_name) ILIKE ${like})
    ORDER BY student_number ASC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export default async function StudentsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;
    const query = (params.q ?? "").trim();
    const saved = params.saved ?? "";
    const requestedPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

    const totalResults = await countStudents(query);
    const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));
    const currentPage = Math.min(requestedPage, totalPages);
    const rows = await searchStudents(query, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE);

    const canAdd = canManageRecords(session.role);
    const canEdit = canManageStudents(session.role);

    const pageHref = (p: number) => {
        const sp = new URLSearchParams();
        if (query) sp.set("q", query);
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

    const firstShown = totalResults === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const lastShown = (currentPage - 1) * PAGE_SIZE + rows.length;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
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

            <form className="flex gap-2" action={BASE}>
                <input
                    name="q"
                    defaultValue={query}
                    autoComplete="off"
                    placeholder="Search by student number or name"
                    className="h-10 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                />

            </form>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">


                {/* Phone: card bawat estudyante (kapareho ng Employees) */}
                <div className="space-y-3 p-3 md:hidden">
                    {rows.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-gray-500">No students found.</p>
                    )}
                    {rows.map((s) => (
                        <div key={s.student_id} className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="break-words text-[15px] font-semibold text-gray-900">
                                {s.last_name}, {s.first_name}
                                {s.middle_name ? ` ${s.middle_name}` : ""}
                            </p>
                            <p className="text-xs text-gray-500">{s.student_number}</p>

                            <dl className="mt-3 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-sm">
                                <dt className="text-gray-500">Grade/Level</dt>
                                <dd className="text-gray-900">{s.grade_level ?? "—"}</dd>
                                <dt className="text-gray-500">Program</dt>
                                <dd className="text-gray-900">{s.program ?? "—"}</dd>
                            </dl>

                            <div className="mt-3 flex items-center gap-5 border-t border-gray-100 pt-3 text-sm font-semibold text-[#15664f]">
                                {canEdit && (
                                    <ConfirmLink
                                        href={`${BASE}/edit?student=${encodeURIComponent(s.student_number)}`}
                                        title="Edit student details"
                                        message={`Edit the details of ${s.first_name} ${s.last_name} (${s.student_number})?`}
                                        confirmLabel="Edit"
                                        className="inline-flex items-center gap-1.5 hover:underline"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Edit
                                    </ConfirmLink>
                                )}
                                <Link
                                    href={`${HEALTH_BASE}?student=${encodeURIComponent(s.student_number)}`}
                                    className="hover:underline"
                                >
                                    Health Record
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Laptop pataas: table */}
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-200 bg-[#EEEEEE] text-[#15664f]">
                            <tr>
                                <th className="px-4 py-3 font-medium">Student Number</th>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Grade/Level</th>
                                <th className="px-4 py-3 font-medium">Program</th>
                                <th className="px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No students found.
                                    </td>
                                </tr>
                            )}
                            {rows.map((s) => (
                                <tr key={s.student_id} className="border-b border-gray-100 last:border-0">
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                                        {s.student_number}
                                    </td>
                                    <td className="px-4 py-3 text-black">
                                        {s.last_name}, {s.first_name}
                                        {s.middle_name ? ` ${s.middle_name}` : ""}
                                    </td>
                                    <td className="px-4 py-3 text-black">{s.grade_level ?? "—"}</td>
                                    <td className="px-4 py-3 text-black">{s.program ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-4">
                                            {canEdit && (
                                                <ConfirmLink
                                                    href={`${BASE}/edit?student=${encodeURIComponent(s.student_number)}`}
                                                    title="Edit student details"
                                                    message={`Edit the details of ${s.first_name} ${s.last_name} (${s.student_number})?`}
                                                    confirmLabel="Edit"
                                                    className="font-medium text-[#15664f] hover:underline"
                                                >
                                                    Edit
                                                </ConfirmLink>
                                            )}
                                            <Link
                                                href={`${HEALTH_BASE}?student=${encodeURIComponent(s.student_number)}`}
                                                className="font-medium text-[#15664f] hover:underline"
                                            >
                                                Health Record
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalResults > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
                        <p>
                            Showing {firstShown}–{lastShown} of {totalResults}
                        </p>

                        {totalPages > 1 && (
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
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}