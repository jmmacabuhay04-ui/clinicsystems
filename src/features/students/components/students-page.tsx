import { redirect } from "next/navigation";
import { Plus, Search, User2 } from "lucide-react";
import { getStudentFilterOptions, listStudents, STUDENTS_PAGE_SIZE } from "../service";
import type { StudentFilters, StudentListRow as Row } from "../types";
import { getSession } from "@/lib/auth/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import FlashMessage from "@/components/shared/flash-message";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";

const BASE = "/dashboard/students";
const HEALTH_BASE = "/dashboard/student-health-records";

type Props = {
    searchParams: Promise<{ q?: string; grade?: string; program?: string; saved?: string; page?: string }>;
};

const selectClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const viewBtn =
    "inline-flex h-8 items-center rounded-md bg-[#15664f] px-4 text-xs font-semibold text-white hover:bg-[#10523f]";
const editBtn =
    "inline-flex h-8 items-center rounded-md bg-[#f6d860] px-4 text-xs font-semibold text-gray-900 hover:bg-[#efcc3f]";

export default async function StudentsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const params = await searchParams;
    const filters: StudentFilters = {
        q: (params.q ?? "").trim(),
        grade: (params.grade ?? "").trim(),
        program: (params.program ?? "").trim(),
    };
    const saved = params.saved ?? "";
    const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
    const canAdd = canManageRecords(session.role);
    const canEdit = canManageStudents(session.role);

    // Link na may parehong search/filters, iba lang ang page.
    const hrefFor = (p: number) => {
        const sp = new URLSearchParams();
        if (filters.q) sp.set("q", filters.q);
        if (filters.grade) sp.set("grade", filters.grade);
        if (filters.program) sp.set("program", filters.program);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `${BASE}?${qs}` : BASE;
    };

    const [{ students, total, totalPages }, options] = await Promise.all([
        listStudents(filters, page),
        getStudentFilterOptions(),
    ]);
    if (page > totalPages) redirect(hrefFor(totalPages));

    const editHref = (s: Row) => `${BASE}/edit?student=${encodeURIComponent(s.student_number)}`;
    const viewHref = (s: Row) => `${HEALTH_BASE}?student=${encodeURIComponent(s.student_number)}`;
    const fullName = (s: Row) =>
        `${s.first_name}${s.middle_name ? ` ${s.middle_name}` : ""} ${s.last_name}`;
    const viewMessage = (s: Row) =>
        `Open the health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information and your access will be recorded.`;

    const actions = (s: Row) => (
        <>
            <ConfirmLink href={viewHref(s)} title="View health record" message={viewMessage(s)} className={viewBtn}>
                View
            </ConfirmLink>
            {canEdit && (
                <ConfirmLink
                    href={editHref(s)}
                    title="Edit student details"
                    message={`Edit the details of ${s.first_name} ${s.last_name} (${s.student_number})?`}
                    confirmLabel="Edit"
                    className={editBtn}
                >
                    Edit
                </ConfirmLink>
            )}
        </>
    );

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center text-[#15664f]">
                        <User2 className="h-10 w-10" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Students</h1>
                        <p className="text-sm text-gray-600">Manage and view all registered students.</p>
                    </div>
                </div>
                {canAdd ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add a new student?"
                        message="You will be taken to the form to create a new student account."
                        confirmLabel="Continue"
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Student
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">View only</span>
                )}
            </div>

            {saved && (
                <FlashMessage key={saved} clearParam="saved">
                    Student {saved} was saved.
                </FlashMessage>
            )}

            <section className="overflow-hidden rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10">
                {/* Search + filters */}
                <form method="get" action={BASE} className="grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem] md:items-end md:p-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            name="q"
                            defaultValue={filters.q}
                            autoComplete="off"
                            placeholder="Search by name or student number..."
                            suppressHydrationWarning
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-base text-gray-900 outline-none placeholder:text-sm focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20 md:text-sm"
                        />
                    </div>
                    <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600">Grade Level</span>
                        <AutoSubmitSelect name="grade" defaultValue={filters.grade} options={options.grades} className={selectClass} />
                    </label>
                    <label className="block space-y-1">
                        <span className="text-xs font-medium text-gray-600">Program</span>
                        <AutoSubmitSelect name="program" defaultValue={filters.program} options={options.programs} className={selectClass} />
                    </label>
                </form>

                {students.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-500">No students found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {students.map((s) => (
                                <li key={s.student_id} className="rounded-lg border border-gray-200 p-3">
                                    <p className="break-words text-sm font-semibold text-gray-900">{fullName(s)}</p>
                                    <p className="text-xs text-gray-500">{s.student_number}</p>
                                    <p className="mt-1 text-sm text-gray-700">
                                        {[s.grade_level, s.program].filter(Boolean).join(" · ") || "—"}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">{actions(s)}</div>
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-gray-200 bg-[#f6faf8] text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Student Number</th>
                                        <th className="px-5 py-3 font-semibold">Full Name</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Grade Level</th>
                                        <th className="px-5 py-3 font-semibold">Program</th>
                                        <th className="px-5 py-3 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => (
                                        <tr key={s.student_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">{s.student_number}</td>
                                            <td className="px-5 py-4 text-gray-900">{fullName(s)}</td>
                                            <td className="px-5 py-4 text-gray-700">{s.grade_level ?? "—"}</td>
                                            <td className="px-5 py-4 text-gray-700">{s.program ?? "—"}</td>
                                            <td className="whitespace-nowrap px-5 py-4">
                                                <div className="flex items-center gap-2">{actions(s)}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <ListPagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={STUDENTS_PAGE_SIZE}
                    hrefFor={hrefFor}
                />
            </section>
        </main>
    );
}