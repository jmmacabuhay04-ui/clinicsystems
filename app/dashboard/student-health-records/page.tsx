import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, Pencil, Plus, Search, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ConfirmButton from "@/components/confirm-button";
import { archiveRecord } from "./record-actions";
import { archiveStudent } from "./student-actions";
import { canManageRecords, canManageStudents } from "@/lib/permissions";
import ConfirmLink from "@/components/confirm-link";
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

type Props = {
    searchParams: Promise<{ q?: string; student?: string }>;
};

const BASE = "/dashboard/student-health-records";

function formatDate(date: Date | null, month: "short" | "long" = "short") {
    if (!date) return "\u2014";
    return new Date(date).toLocaleDateString("en-US", {
        month,
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

function show(value: number | string | null | undefined, unit = "") {
    return value === null || value === undefined || value === "" ? "\u2014" : `${value}${unit}`;
}

async function searchStudents(q: string) {
    if (!q) {
        return prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, date_of_birth, gender
      FROM students
      WHERE archived_at IS NULL
        ORDER BY student_number ASC
      LIMIT 20
    `;
    }

    const like = `%${q}%`;
    return prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program, date_of_birth, gender
    FROM students
    WHERE archived_at IS NULL
      AND (student_number ILIKE ${like}
        OR last_name ILIKE ${like}
        OR first_name ILIKE ${like}
        OR middle_name ILIKE ${like}
        OR (first_name || ' ' || last_name) ILIKE ${like}
        OR (last_name || ', ' || first_name) ILIKE ${like})
    ORDER BY last_name, first_name
    LIMIT 50
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

    let selected: StudentRow | undefined;
    let results: StudentRow[] = [];

    if (selectedNumber) {
        const rows = await prisma.$queryRaw<StudentRow[]>`
      SELECT student_id, student_number, last_name, first_name, middle_name,
             grade_level, program, date_of_birth, gender
      FROM students
      WHERE student_number = ${selectedNumber} AND archived_at IS NULL
      LIMIT 1
    `;
        selected = rows[0];
    } else {
        results = await searchStudents(q);
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
        { label: "Temperature", value: show(latestVitals?.temperature, "\u00B0C") },
        { label: "Last Updated", value: records[0] ? formatDate(records[0].visit_date) : "\u2014" },
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
        ]
        : [];

    const addHref = selected
        ? `${BASE}/new?student=${encodeURIComponent(selected.student_number)}`
        : `${BASE}/new`;

    const backHref = q ? `${BASE}?q=${encodeURIComponent(q)}` : BASE;

    return (
        <main className="space-y-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-semibold text-gray-900">Student Health Records</h1>
                {canEdit ? (
                    <div className="flex flex-wrap items-center gap-3">
                        {canAddStudent && (
                            <ConfirmLink
                                href={`${BASE}/students/new`}
                                title="Add student"
                                message="Register a new student and create their student portal account?"
                                confirmLabel="Continue"
                                icon={<UserPlus className="h-5 w-5" />}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-gray-900 hover:bg-amber-500"
                            >
                                <UserPlus className="h-4 w-4" />
                                Add Student
                            </ConfirmLink>
                        )}
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

            <form method="get" action={BASE} className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    name="q"
                    defaultValue={q}
                    placeholder="Search by student number or name..."
                    suppressHydrationWarning
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                />
            </form>

            {selectedNumber && !selected && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    No active student found with number {selectedNumber}. It may have been archived.
                </div>
            )}

            {!selected && !selectedNumber && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
                        {q ? `Search results for "${q}"` : "Recently registered students"}
                    </div>

                    {results.length === 0 ? (
                        <p className="p-8 text-center text-sm text-gray-500">No students found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Grade/Level</th>
                                        <th className="px-4 py-3 font-medium">Program</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Student Number</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Last Name</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">First Name</th>
                                        <th className="whitespace-nowrap px-4 py-3 font-medium">Middle Name</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((s) => (
                                        <tr key={s.student_id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-gray-600">{show(s.grade_level)}</td>
                                            <td className="px-4 py-3 text-gray-600">{show(s.program)}</td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{s.student_number}</td>
                                            <td className="px-4 py-3 text-gray-900">{s.last_name}</td>
                                            <td className="px-4 py-3 text-gray-900">{s.first_name}</td>
                                            <td className="px-4 py-3 text-gray-900">{show(s.middle_name)}</td>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <ConfirmLink
                                                        href={`${BASE}?student=${encodeURIComponent(s.student_number)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                                                        title="View health record"
                                                        message={`Open the health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information.`}
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
                            Back to student list
                        </Link>
                    )}

                    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                                    href={`${BASE}/students/edit?student=${encodeURIComponent(selected.student_number)}`}
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
                        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
                            {vitals.map((v) => (
                                <div key={v.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <p className="text-sm text-gray-500">{v.label}</p>
                                    <p className="mt-2 text-xl font-semibold text-gray-900">{v.value}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-3 text-lg font-semibold text-gray-900">Visit History</h2>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                            {records.length === 0 ? (
                                <p className="p-8 text-center text-sm text-gray-500">No clinic visits recorded yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-700">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Date</th>
                                                <th className="px-4 py-3 font-medium">Complaint</th>
                                                <th className="px-4 py-3 font-medium">Action Taken</th>
                                                <th className="px-4 py-3 font-medium">Attending Staff</th>
                                                {canEdit && <th className="px-4 py-3 font-medium">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((r) => (
                                                <tr key={r.record_id} className="border-t border-gray-100">
                                                    <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                                                        {formatDate(r.visit_date)}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900">{r.complaint}</td>
                                                    <td className="px-4 py-3 text-gray-900">{r.action_taken ?? "\u2014"}</td>
                                                    <td className="px-4 py-3 text-gray-900">{r.attending_staff ?? "\u2014"}</td>
                                                    {canEdit && (
                                                        <td className="whitespace-nowrap px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <ConfirmLink
                                                                    href={`${BASE}/edit?record=${r.record_id}`}
                                                                    title="Edit visit record"
                                                                    message={`Edit this visit (${formatDate(r.visit_date)} - ${r.complaint})?`}
                                                                    confirmLabel="Edit"
                                                                    className="inline-flex items-center gap-1 font-medium text-[#15664f] hover:underline"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                    Edit
                                                                </ConfirmLink>
                                                                <form action={archiveRecord}>
                                                                    <input type="hidden" name="recordId" value={r.record_id} />
                                                                    <ConfirmButton
                                                                        title="Archive visit record"
                                                                        confirmLabel="Archive"
                                                                        message={`Archive this visit (${formatDate(r.visit_date)} - ${r.complaint})? It will move to Archive Records. You can restore it later.`}
                                                                        className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                                                                    >
                                                                        <Archive className="h-3.5 w-3.5" />
                                                                        Archive
                                                                    </ConfirmButton>
                                                                </form>
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
