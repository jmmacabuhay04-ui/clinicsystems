import { redirect } from "next/navigation";
import { ClipboardList, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageDentalForm } from "@/lib/permissions";
import { LEGEND, OCCLUSION, PERIODONTAL, TREATMENT } from "@/features/dental-health-form/chart-data";
import ToothGrid, { type ChartMap } from "./tooth-grid";
import PrintButton from "./print-button";
import ConfirmLink from "@/components/shared/confirm-link";
import PrintHeader from "@/components/layout/print-header";
import FlashMessage from "@/components/shared/flash-message";
import PersonPicker from "@/components/shared/person-picker";

const BASE = "/dashboard/dental-health-form";

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
    has_form: boolean;
};

type FormRow = {
    level: string | null;
    section: string | null;
    age: number | null;
    sex: string | null;
    chart: ChartMap | null;
    periodontal: Record<string, boolean> | null;
    occlusion: Record<string, boolean> | null;
    treatment: Record<string, boolean> | null;
    remarks: string | null;
    exam_date: Date | null;
    examined_by: string | null;
    updated_by: string | null;
    updated_at: Date | null;
};

type Props = {
    searchParams: Promise<{ q?: string; student?: string; saved?: string }>;
};

function fmtDate(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

function fullName(s: StudentRow) {
    const middle = s.middle_name ? ` ${s.middle_name}` : "";
    return `${s.first_name}${middle} ${s.last_name}`;
}

function CheckList({
    title,
    items,
    checked,
}: {
    title: string;
    items: { key: string; label: string }[];
    checked: Record<string, boolean>;
}) {
    return (
        <div className="min-w-0">
            <h3 className="border-l-4 border-[#15664f] pl-3 text-sm font-semibold uppercase tracking-wide text-gray-900">{title}</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
                {items.map((item) => (
                    <p key={item.key} className="flex items-start gap-2">
                        <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-sm font-semibold ${checked[item.key]
                                ? "border-[#15664f] bg-[#15664f] text-white"
                                : "border-gray-300 bg-white text-transparent"
                                }`}
                        >
                            ✓
                        </span>
                        <span className="min-w-0 break-words">{item.label}</span>
                    </p>
                ))}
            </div>
        </div>
    );
}

export default async function DentalHealthFormPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", student: studentNumber = "", saved } = await searchParams;
    const canEdit = canManageDentalForm(session.role);
    const like = `%${q}%`;

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT s.student_id, s.student_number, s.last_name, s.first_name, s.middle_name, s.grade_level, s.program, s.date_of_birth, s.gender,
           EXISTS (SELECT 1 FROM dental_health_forms f WHERE f.student_id = s.student_id) AS has_form
    FROM students s
    WHERE s.archived_at IS NULL
      AND (
        ${q}::text = ''
        OR s.student_number ILIKE ${like}
        OR s.last_name ILIKE ${like}
        OR s.first_name ILIKE ${like}
      )
    ORDER BY s.last_name, s.first_name
    LIMIT 50
  `;

    const selected = studentNumber
        ? students.find((s) => s.student_number === studentNumber) ??
        (
            await prisma.$queryRaw<StudentRow[]>`
          SELECT student_id, student_number, last_name, first_name, middle_name,
                 grade_level, program, date_of_birth, gender
          FROM students
          WHERE student_number = ${studentNumber}
          LIMIT 1
        `
        )[0]
        : undefined;

    let form: FormRow | undefined;
    if (selected) {
        const rows = await prisma.$queryRaw<FormRow[]>`
      SELECT level, section, age, sex, chart, periodontal, occlusion, treatment,
             remarks, exam_date, examined_by, updated_by, updated_at
      FROM dental_health_forms
      WHERE student_id = ${selected.student_id}
      LIMIT 1
    `;
        form = rows[0];
    }

    const chart = form?.chart ?? {};
    const perio = form?.periodontal ?? {};
    const occ = form?.occlusion ?? {};
    const tx = form?.treatment ?? {};

    return (
        <main className="min-w-0 space-y-6 p-4 pb-8 md:p-8">
            <style
                dangerouslySetInnerHTML={{
                    __html: `@media print {
            aside, .no-print { display: none !important; }
            body { background: #ffffff !important; }
            main { padding: 0 !important; }
          }`,
                }}
            />

            <div className="no-print flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Dental Health Form</h1>
                        <p className="text-sm text-gray-600">Tooth chart, findings, and treatment needed of each student.</p>
                    </div>
                </div>

                {selected && (
                    <div className="flex flex-wrap gap-3">
                        <PrintButton />
                        {canEdit && (
                            <ConfirmLink
                                href={`${BASE}/edit?student=${encodeURIComponent(selected.student_number)}`}
                                title={form ? "Edit form" : "Fill out form"}
                                message={`${form ? "Edit" : "Fill out"} the form of ${selected.first_name} ${selected.last_name} (${selected.student_number})?`}
                                confirmLabel={form ? "Edit" : "Continue"}
                                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                            >
                                <Pencil className="h-4 w-4" />
                                {form ? "Edit Form" : "Fill Out Form"}
                            </ConfirmLink>
                        )}
                    </div>
                )}
            </div>

            {saved === "1" && (
                <div className="no-print">
                    <FlashMessage clearParam="saved">Dental health record saved.</FlashMessage>
                </div>
            )}
            {!canEdit && (
                <p className="no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    View only. You can view this form but cannot edit or print it.
                </p>
            )}
            <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-6">
                <PersonPicker
                    q={q}
                    placeholder="Search name or student number..."
                    heading="Students"
                    activeKey={studentNumber}
                    confirmTitle="View dental health record"
                    emptyText="No students found."
                    items={students.map((s) => ({
                        key: s.student_number,
                        href: `${BASE}?q=${encodeURIComponent(q)}&student=${encodeURIComponent(s.student_number)}`,
                        name: `${s.first_name} ${s.last_name}`,
                        initials: `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase(),
                        sub: `${s.student_number}${s.grade_level ? ` · ${s.grade_level}` : ""}`,
                        hasForm: Boolean(s.has_form),
                        message: `Open the dental health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information.`,
                    }))}
                />

                <section className="min-w-0 space-y-4 lg:space-y-6">
                    {!selected && (
                        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-8 text-center md:p-16">
                            <ClipboardList className="h-12 w-12 text-[#15664f]/40" />
                            <p className="mt-3 text-base font-semibold text-gray-800">No student selected</p>
                            <p className="mt-1 text-sm text-gray-600">
                                Select a student <span className="lg:hidden">from the list above</span>
                                <span className="hidden lg:inline">on the left</span> to view their dental health record.
                            </p>
                        </div>
                    )}

                    {selected && (
                        <>
                            <PrintHeader />
                            <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                                <h2 className="text-center text-base font-bold uppercase tracking-wide text-[#15664f] md:text-lg">
                                    Student&apos;s Dental Health Record
                                </h2>
                                <div className="mt-4 grid gap-x-8 gap-y-2 text-sm md:mt-5 md:grid-cols-2 md:gap-y-3">
                                    <p className="break-words">
                                        <span className="font-semibold text-gray-600">Name:</span>{" "}
                                        <span className="text-gray-900">{fullName(selected)}</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-600">Date of Birth:</span>{" "}
                                        <span className="text-gray-900">{fmtDate(selected.date_of_birth)}</span>
                                    </p>
                                    <p className="break-words">
                                        <span className="font-semibold text-gray-600">Level:</span>{" "}
                                        <span className="text-gray-900">
                                            {form?.level || selected.grade_level || "—"}
                                        </span>
                                    </p>
                                    <p className="break-words">
                                        <span className="font-semibold text-gray-600">Section:</span>{" "}
                                        <span className="text-gray-900">
                                            {form?.section || selected.program || "—"}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-600">Age:</span>{" "}
                                        <span className="text-gray-900">{form?.age ?? "—"}</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-600">Sex:</span>{" "}
                                        <span className="text-gray-900">
                                            {form?.sex || selected.gender || "—"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {!form ? (
                                <div className="rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-6 text-center md:p-12">
                                    <p className="text-sm text-gray-600 md:text-base">
                                        No dental health record yet for this student.
                                    </p>
                                    {canEdit && (
                                        <div className="mt-4 flex justify-center">
                                            <ConfirmLink
                                                href={`${BASE}/edit?student=${encodeURIComponent(selected.student_number)}`}
                                                title="Fill out form"
                                                message={`Fill out the form of ${selected.first_name} ${selected.last_name} (${selected.student_number})?`}
                                                confirmLabel="Continue"
                                                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Fill Out Form
                                            </ConfirmLink>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                                        {/* Kung malapad ang tooth chart, puwedeng i-scroll pakaliwa/pakanan sa mobile */}
                                        <div className="overflow-x-auto">
                                            <ToothGrid chart={chart} readOnly />
                                        </div>

                                        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 md:mt-6 md:p-4">
                                            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                                                Legend
                                            </h3>
                                            <div className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
                                                {LEGEND.map((item) => (
                                                    <p key={item.code}>
                                                        <span className="font-semibold text-gray-900">{item.code}</span> –{" "}
                                                        {item.meaning}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                                        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
                                            <CheckList
                                                title="Periodontal Condition"
                                                items={PERIODONTAL}
                                                checked={perio}
                                            />
                                            <CheckList title="Occlusion" items={OCCLUSION} checked={occ} />
                                            <CheckList title="Treatment Needed" items={TREATMENT} checked={tx} />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                                        <h3 className="border-l-4 border-[#15664f] pl-3 text-sm font-semibold uppercase tracking-wide text-gray-900">
                                            Remarks
                                        </h3>
                                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-900">
                                            {form.remarks || "—"}
                                        </p>

                                        <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-4 text-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6 md:mt-6 md:pt-5">
                                            <p>
                                                <span className="font-semibold text-gray-600">
                                                    Date of Examination:
                                                </span>{" "}
                                                <span className="text-gray-900">{fmtDate(form.exam_date)}</span>
                                            </p>
                                            <div className="text-center">
                                                <p className="break-words font-semibold text-gray-900 underline">
                                                    {form.examined_by || "—"}
                                                </p>
                                                <p className="text-sm text-gray-600">Examined by · School Dentist</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}