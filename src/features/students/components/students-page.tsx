import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { getStudentFilterOptions, listStudents, STUDENTS_PAGE_SIZE } from "../service";
import type { StudentFilters, StudentListRow as Row } from "../types";
import { getSession } from "@/lib/auth/session";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/shared/confirm-link";
import FlashMessage from "@/components/shared/flash-message";
import AutoSubmitSelect from "@/components/shared/auto-submit-select";
import ListPagination from "@/components/shared/list-pagination";
import SearchInput from "@/components/shared/search-input";
import RowActionMenu, { type RowAction } from "@/components/shared/row-action-menu";
import UnauthorizedAccess from "@/components/shared/unauthorized-access";

const BASE = "/dashboard/students";
const HEALTH_BASE = "/dashboard/student-health-records";

type Props = {
    searchParams: Promise<{ q?: string; grade?: string; program?: string; saved?: string; page?: string }>;
};

const selectClass =
    "h-11 w-full rounded-xl border border-[#dcebe3] bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10";

// Profile picture; initials kapag wala pang picture
function Avatar({ src, first, last }: { src?: string | null; first: string; last: string }) {
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#15664f]/30" />;
    }
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#15664f] text-sm font-semibold text-white">
            {`${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase()}
        </span>
    );
}

// Lahat ng nasa listahan ay hindi naka-archive, kaya "Active"
function ActiveBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f1e9] px-2.5 py-0.5 text-sm font-medium text-[#15664f]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#15664f]" />
            Active
        </span>
    );
}

function formatGender(g?: string | null) {
    if (!g) return "—";
    return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

export default async function StudentsPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    // Admin: health records lang ang makikita, hindi ang detalye ng student/employee
    if (session.role === "admin") {
        return <UnauthorizedAccess message="Administrators can view health records only, not personal details of students and employees." />;
    }

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

    // Mga pagpipilian sa "⋮" menu ng bawat row
    const actions = (s: Row): RowAction[] => [
        { label: "View Health Record", href: viewHref(s), title: "View health record", message: viewMessage(s), confirmLabel: "View", icon: "view" },
        ...(canEdit
            ? [
                {
                    label: "Edit Details",
                    href: editHref(s),
                    title: "Edit student details",
                    message: `Edit the details of ${s.first_name} ${s.last_name} (${s.student_number})?`,
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
                    <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Students</h1>
                    <p className="mt-1 text-sm text-gray-600">Manage and view student information.</p>
                </div>
                {canAdd ? (
                    <ConfirmLink
                        href={`${BASE}/new`}
                        title="Add a new student?"
                        message="You will be taken to the form to create a new student account."
                        confirmLabel="Continue"
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#15664f] px-5 text-sm font-semibold text-white shadow-md shadow-[#15664f]/20 hover:bg-[#10523f]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Student
                    </ConfirmLink>
                ) : (
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-sm font-medium text-gray-600">View only</span>
                )}
            </div>

            {saved && (
                <FlashMessage key={saved} clearParam="saved">
                    Student {saved} was saved.
                </FlashMessage>
            )}

            <section className="overflow-hidden rounded-2xl border border-[#dcebe3] bg-white shadow-sm shadow-[#15664f]/5">
                {/* Filters sa kaliwa, search sa kanan */}
                <form
                    method="get"
                    action={BASE}
                    className="grid gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[12rem_12rem_minmax(0,1fr)]"
                >
                    <AutoSubmitSelect
                        name="grade"
                        defaultValue={filters.grade}
                        options={options.grades}
                        allLabel="All Grade Levels"
                        className={selectClass}
                    />
                    <AutoSubmitSelect
                        name="program"
                        defaultValue={filters.program}
                        options={options.programs}
                        allLabel="All Programs"
                        className={selectClass}
                    />
                    <div className="relative sm:col-span-2 lg:col-span-1 lg:ml-auto lg:w-full lg:max-w-sm">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                        <SearchInput
                            name="q"
                            defaultValue={filters.q}
                            autoComplete="off"
                            placeholder="Search by name or student no..."
                            suppressHydrationWarning
                            className="h-11 w-full rounded-xl border border-[#dcebe3] bg-white pl-10 pr-3 text-base text-gray-900 outline-none focus:border-[#15664f] focus:ring-4 focus:ring-[#15664f]/10 md:text-sm"
                        />
                    </div>
                </form>

                {students.length === 0 ? (
                    <p className="border-t border-gray-100 p-8 text-center text-sm text-gray-600">No students found.</p>
                ) : (
                    <>
                        {/* MOBILE: card list */}
                        <ul className="space-y-2 border-t border-gray-100 p-3 md:hidden">
                            {students.map((s) => (
                                <li key={s.student_id} className="flex items-start gap-3 rounded-xl border border-[#e4ede8] p-3">
                                    <Avatar src={s.avatar} first={s.first_name} last={s.last_name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-semibold text-gray-900">{fullName(s)}</p>
                                        <p className="text-sm text-gray-600">{s.student_number}</p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {[s.grade_level, s.program, s.gender ? formatGender(s.gender) : null]
                                                .filter(Boolean)
                                                .join(" · ") || "—"}
                                        </p>
                                        <div className="mt-2">
                                            <ActiveBadge />
                                        </div>
                                    </div>
                                    <RowActionMenu actions={actions(s)} />
                                </li>
                            ))}
                        </ul>

                        {/* DESKTOP: table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-y border-[#e4ede8] bg-[#f6faf8] text-gray-600">
                                    <tr>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Student Number</th>
                                        <th className="px-5 py-3 font-semibold">Name</th>
                                        <th className="whitespace-nowrap px-5 py-3 font-semibold">Grade Level</th>
                                        <th className="px-5 py-3 font-semibold">Program</th>
                                        <th className="px-5 py-3 font-semibold">Gender</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 text-center font-semibold">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => (
                                        <tr key={s.student_id} className="border-t border-gray-100 hover:bg-[#f6faf8]">
                                            <td className="whitespace-nowrap px-5 py-3 text-gray-600">{s.student_number}</td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={s.avatar} first={s.first_name} last={s.last_name} />
                                                    <span className="font-medium text-gray-900">{fullName(s)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">{s.grade_level ?? "—"}</td>
                                            <td className="px-5 py-3 text-gray-600">{s.program ?? "—"}</td>
                                            <td className="px-5 py-3 text-gray-600">{formatGender(s.gender)}</td>
                                            <td className="px-5 py-3">
                                                <ActiveBadge />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <RowActionMenu actions={actions(s)} />
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