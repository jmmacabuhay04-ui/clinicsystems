import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, ClipboardList, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import { GOING_HOME, SYMPTOMS } from "@/features/health-declaration/form-data";
import PrintButton from "./print-button";
import ConfirmLink from "@/components/shared/confirm-link";
import PrintHeader from "@/components/layout/print-header";
import FlashMessage from "@/components/shared/flash-message";
import PersonPicker from "@/components/shared/person-picker";

const BASE = "/dashboard/health-declaration";

type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
    has_form: boolean;
};

type DeclarationRow = {
    school_year: string | null;
    grade_section: string | null;
    residence_address: string | null;
    emergency_name: string | null;
    emergency_relationship: string | null;
    emergency_numbers: string | null;
    going_home: string | null;
    going_home_other: string | null;
    symptoms: Record<string, boolean> | null;
    symptom_notes: string | null;
    vaccination_submitted: boolean;
    medical_cert_submitted: boolean;
    medicines: string | null;
    certified_by: string | null;
    declaration_date: Date | null;
    updated_by: string | null;
    updated_at: Date | null;
};

type Props = {
    searchParams: Promise<{ q?: string; student?: string; saved?: string }>;
};

function fmt(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    });
}

function val(value: string | null | undefined) {
    return value && value.trim() ? value : "—";
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <p className="break-words text-sm">
            <span className="font-semibold text-gray-700">{label}:</span>{" "}
            <span className="text-gray-900">{value}</span>
        </p>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0 rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
            <h3 className="border-l-4 border-[#15664f] pl-3 text-sm font-bold uppercase tracking-wide text-gray-900">{title}</h3>
            <div className="mt-3 md:mt-4">{children}</div>
        </div>
    );
}

function CheckRow({ checked, label }: { checked: boolean; label: string }) {
    return (
        <p className="flex items-center gap-2">
            <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold ${checked
                    ? "border-[#15664f] bg-[#15664f] text-white"
                    : "border-gray-300 bg-white text-transparent"
                    }`}
            >
                ✓
            </span>
            <span className="text-gray-700">{label}</span>
        </p>
    );
}

export default async function HealthDeclarationPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", student: studentNumber = "", saved } = await searchParams;
    const canEdit = canManageRecords(session.role);
    const like = `%${q}%`;

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT s.student_id, s.student_number, s.last_name, s.first_name, s.middle_name, s.grade_level, s.program,
           EXISTS (SELECT 1 FROM health_declarations f WHERE f.student_id = s.student_id) AS has_form
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
        ? students.find((s) => s.student_number === studentNumber)
        : undefined;

    let form: DeclarationRow | undefined;
    if (selected) {
        const rows = await prisma.$queryRaw<DeclarationRow[]>`
      SELECT * FROM health_declarations WHERE student_id = ${selected.student_id} LIMIT 1
    `;
        form = rows[0];
    }

    const symptoms = form?.symptoms ?? {};
    const present = SYMPTOMS.filter((item) => symptoms[item.key]);
    const goingHomeLabel =
        GOING_HOME.find((option) => option.key === form?.going_home)?.label ?? "—";

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
                    <ClipboardList className="h-10 w-10 shrink-0 text-[#15664f]" />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">Health Declaration</h1>
                        <p className="text-sm text-gray-600">Student information and health status declaration of each student.</p>
                    </div>
                </div>

                {selected && canEdit && (
                    <div className="flex flex-wrap gap-3">
                        <PrintButton />
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
                    </div>
                )}
            </div>

            {saved === "1" && (
                <div className="no-print">
                    <FlashMessage clearParam="saved">Declaration saved.</FlashMessage>
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
                    confirmTitle="View health declaration"
                    emptyText="No students found."
                    items={students.map((s) => ({
                        key: s.student_number,
                        href: `${BASE}?q=${encodeURIComponent(q)}&student=${encodeURIComponent(s.student_number)}`,
                        name: `${s.first_name} ${s.last_name}`,
                        initials: `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase(),
                        sub: `${s.student_number}${s.grade_level ? ` · ${s.grade_level}` : ""}`,
                        hasForm: Boolean(s.has_form),
                        message: `Open the health declaration of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information.`,
                    }))}
                />

                <section className="min-w-0 space-y-4 lg:space-y-6">
                    {!selected && (
                        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-8 text-center md:p-16">
                            <ClipboardList className="h-12 w-12 text-[#15664f]/40" />
                            <p className="mt-3 text-base font-semibold text-gray-800">No student selected</p>
                            <p className="mt-1 text-sm text-gray-500">
                                Select a student <span className="lg:hidden">from the list above</span>
                                <span className="hidden lg:inline">on the left</span> to view the declaration.
                            </p>
                        </div>
                    )}

                    {selected && !form && (
                        <div className="rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-6 text-center md:p-12">
                            <p className="text-sm text-gray-500 md:text-base">No declaration yet for this student.</p>
                            {canEdit && (
                                <Link
                                    href={`${BASE}/edit?student=${encodeURIComponent(selected.student_number)}`}
                                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f]"
                                >
                                    Fill Out Form
                                </Link>
                            )}
                        </div>
                    )}

                    {selected && form && (
                        <>
                            <PrintHeader />
                            <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                                <h2 className="text-center text-base font-bold uppercase tracking-wide text-[#15664f] md:text-lg">
                                    Student Information and Health Status Declaration
                                </h2>
                                {form.school_year && (
                                    <p className="mt-1 text-center text-sm font-semibold text-gray-700">
                                        School Year {form.school_year}
                                    </p>
                                )}
                                <div className="mt-4 grid gap-x-8 gap-y-2 md:mt-5 md:grid-cols-2">
                                    <Row
                                        label="Learner's Full Name"
                                        value={`${selected.first_name}${selected.middle_name ? ` ${selected.middle_name}` : ""
                                            } ${selected.last_name}`}
                                    />
                                    <Row label="Student Number" value={selected.student_number} />
                                    <Row
                                        label="Grade/Year Level & Section"
                                        value={val(form.grade_section ?? selected.grade_level)}
                                    />
                                    <Row label="Means of Going Home" value={goingHomeLabel} />
                                    <div className="md:col-span-2">
                                        <Row label="Residence Address" value={val(form.residence_address)} />
                                    </div>
                                    {form.going_home === "others" && (
                                        <div className="md:col-span-2">
                                            <Row label="Others" value={val(form.going_home_other)} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Card title="Emergency Contact">
                                <div className="grid gap-x-8 gap-y-2 md:grid-cols-3">
                                    <Row label="Contact Person" value={val(form.emergency_name)} />
                                    <Row label="Relationship" value={val(form.emergency_relationship)} />
                                    <Row label="Contact Number/s" value={val(form.emergency_numbers)} />
                                </div>
                            </Card>

                            <Card title="Health Status Declaration">
                                {present.length === 0 ? (
                                    <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">
                                        No symptoms declared in the past 14 days.
                                    </p>
                                ) : (
                                    <>
                                        <p className="mb-3 text-sm font-semibold text-red-700">
                                            {present.length} symptom{present.length === 1 ? "" : "s"} declared:
                                        </p>
                                        <ul className="grid gap-x-6 gap-y-1 text-sm text-gray-900 sm:grid-cols-2">
                                            {present.map((item) => (
                                                <li key={item.key} className="flex items-start gap-2">
                                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                                                    <span className="min-w-0 break-words">{item.label}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {form.symptom_notes && (
                                    <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-900">
                                        <span className="font-semibold text-gray-700">Notes:</span>{" "}
                                        {form.symptom_notes}
                                    </p>
                                )}
                            </Card>

                            <Card title="Requirements Submitted">
                                <div className="space-y-2 text-sm">
                                    <CheckRow checked={form.vaccination_submitted} label="Vaccination record" />
                                    <CheckRow checked={form.medical_cert_submitted} label="Medical certification" />
                                </div>

                                <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-900">
                                    <span className="font-semibold text-gray-700">Medicines:</span>{" "}
                                    {val(form.medicines)}
                                </p>
                            </Card>

                            <Card title="Certification of Parent / Guardian">
                                <div className="flex flex-col gap-4 text-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-6">
                                    <div className="text-center">
                                        <p className="break-words font-semibold text-gray-900 underline">
                                            {val(form.certified_by)}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Signature over Printed Name of Parent / Guardian
                                        </p>
                                    </div>
                                    <p>
                                        <span className="font-semibold text-gray-700">Date:</span>{" "}
                                        <span className="text-gray-900">{fmt(form.declaration_date)}</span>
                                    </p>
                                </div>

                                {form.updated_by && (
                                    <p className="no-print mt-4 text-xs text-gray-500">
                                        Last updated by {form.updated_by}
                                        {form.updated_at ? ` · ${fmt(form.updated_at)}` : ""}
                                    </p>
                                )}
                            </Card>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}