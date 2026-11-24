import Link from "next/link";
import { redirect } from "next/navigation";
import { FileHeart, Pencil, Archive } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords, canViewHealthRecords } from "@/lib/permissions";
import {
    FAMILY_HISTORY,
    PAST_HISTORY,
    PSYCHOLOGICAL,
    REVIEW_OF_SYSTEM,
} from "@/features/student-health-form/form-data";
import PrintButton from "./print-button";
import ConfirmLink from "@/components/shared/confirm-link";
import PrintHeader from "@/components/layout/print-header";
import FlashMessage from "@/components/shared/flash-message";
import PersonPicker, { BackToList } from "@/components/shared/person-picker";
import { archiveHealthForm } from "@/features/health-forms/archive-actions";

const BASE = "/dashboard/student-health-form";

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
    form_id: number;
    sex: string | null;
    date_of_birth: Date | null;
    birthplace: string | null;
    nationality: string | null;
    religion: string | null;
    address: string | null;
    contact_number: string | null;
    father_name: string | null;
    father_occupation: string | null;
    father_contact: string | null;
    mother_name: string | null;
    mother_occupation: string | null;
    mother_contact: string | null;
    guardian_name: string | null;
    guardian_occupation: string | null;
    guardian_contact: string | null;
    hospital_choice: string | null;
    hospital_address: string | null;
    hospital_contact: string | null;
    doctor_name: string | null;
    emergency_person: string | null;
    emergency_contact: string | null;
    emergency_relation: string | null;
    emergency_address: string | null;
    past_history: Record<string, string> | null;
    past_others: string | null;
    family_history: Record<string, { answer?: string; relation?: string }> | null;
    psychological: Record<string, { answer?: string; details?: string }> | null;
    other_medical: Record<string, string> | null;
    review_of_system: Record<string, { answer?: string; age?: string }> | null;
    consent_name: string | null;
    consent_relationship: string | null;
    consent_date: Date | null;
    updated_by: string | null;
    updated_at: Date | null;
};

type Props = {
    searchParams: Promise<{ q?: string; student?: string; saved?: string; status?: string }>;
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

function answerLabel(answer?: string) {
    if (answer === "yes") return "Yes";
    if (answer === "no") return "No";
    return "—";
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <p className="break-words text-sm">
            <span className="font-semibold text-gray-600">{label}:</span>{" "}
            <span className="text-gray-900">{value}</span>
        </p>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0 rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
            <h3 className="border-l-4 border-[#15664f] pl-3 text-sm font-semibold uppercase tracking-wide text-gray-900">
                {title}
            </h3>
            <div className="mt-3 md:mt-4">{children}</div>
        </div>
    );
}

export default async function StudentHealthFormPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");
    // Health records: Admin, Nurse at Doctor lang (hindi ang Dentist)
    if (!canViewHealthRecords(session.role)) redirect("/dashboard");

    const { q = "", student: studentNumber = "", saved, status = "" } = await searchParams;
    const canEdit = canManageRecords(session.role);
    const like = `%${q}%`;

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT s.student_id, s.student_number, s.last_name, s.first_name, s.middle_name,
           s.grade_level, s.program, s.date_of_birth, s.gender,
           EXISTS (SELECT 1 FROM student_health_forms f WHERE f.student_id = s.student_id AND f.archived_at IS NULL) AS has_form
    FROM students s
    WHERE s.archived_at IS NULL
      AND (
        ${q}::text = ''
        OR s.student_number ILIKE ${like}
        OR s.last_name ILIKE ${like}
        OR s.first_name ILIKE ${like}
      )
    ORDER BY s.last_name, s.first_name
    LIMIT 300
  `;

    const selected = studentNumber
        ? students.find((s) => s.student_number === studentNumber)
        : undefined;

    let form: FormRow | undefined;
    if (selected) {
        const rows = await prisma.$queryRaw<FormRow[]>`
      SELECT * FROM student_health_forms WHERE student_id = ${selected.student_id} AND archived_at IS NULL LIMIT 1
    `;
        form = rows[0];
    }

    const past = form?.past_history ?? {};
    const family = form?.family_history ?? {};
    const psych = form?.psychological ?? {};
    const other = form?.other_medical ?? {};
    const ros = form?.review_of_system ?? {};

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
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Student Health Form</h1>
                        <p className="text-sm text-gray-600">
                            Medical history, review of system, and consent of each student.
                        </p>
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
                    <FlashMessage clearParam="saved">Health form saved.</FlashMessage>
                </div>
            )}

            <div className="min-w-0 space-y-4 lg:space-y-6">
                {!selected && (
                    <PersonPicker
                        base={BASE}
                        status={status}
                        subLabel="Student No. · Year Level"
                        q={q}
                        placeholder="Search name or student number..."
                        heading="Students"
                        activeKey={studentNumber}
                        confirmTitle="View health form"
                        editParam="student"
                        archiveAction={archiveHealthForm}
                        archiveKind="student"
                        emptyText="No students found."
                        items={students.map((s) => ({
                            key: s.student_number,
                            href: `${BASE}?q=${encodeURIComponent(q)}&student=${encodeURIComponent(s.student_number)}`,
                            name: `${s.first_name} ${s.last_name}`,
                            initials: `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase(),
                            sub: `${s.student_number}${s.grade_level ? ` · ${s.grade_level}` : ""}`,
                            hasForm: Boolean(s.has_form),
                            message: `Open the health form of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information.`,
                        }))}
                    />
                )}

                <section className="min-w-0 space-y-4 lg:space-y-6">
                    {selected && <BackToList href={q ? `${BASE}?q=${encodeURIComponent(q)}` : BASE} />}

                    {selected && !form && (
                        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-8 text-center md:p-16">
                            <FileHeart className="h-12 w-12 text-[#15664f]/40" />
                            <p className="mt-3 text-base font-semibold text-gray-800">
                                No health form yet for {selected.first_name} {selected.last_name}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">Fill out the form to record their medical history.</p>
                            {canEdit && (
                                <Link
                                    href={`${BASE}/edit?student=${encodeURIComponent(selected.student_number)}`}
                                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
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
                                    Student&apos;s Health Record
                                </h2>
                                <div className="mt-4 grid gap-x-8 gap-y-2 md:mt-5 md:grid-cols-2">
                                    <Row
                                        label="Name"
                                        value={`${selected.first_name}${selected.middle_name ? ` ${selected.middle_name}` : ""
                                            } ${selected.last_name}`}
                                    />
                                    <Row label="Student Number" value={selected.student_number} />
                                    <Row label="Sex" value={val(form.sex ?? selected.gender)} />
                                    <Row
                                        label="Date of Birth"
                                        value={fmt(form.date_of_birth ?? selected.date_of_birth)}
                                    />
                                    <Row label="Birthplace" value={val(form.birthplace)} />
                                    <Row label="Nationality" value={val(form.nationality)} />
                                    <Row label="Religion" value={val(form.religion)} />
                                    <Row label="Contact Number" value={val(form.contact_number)} />
                                    <div className="md:col-span-2">
                                        <Row label="Address" value={val(form.address)} />
                                    </div>
                                </div>
                            </div>

                            <Card title="Parents / Guardian">
                                <div className="grid gap-x-8 gap-y-2 md:grid-cols-3">
                                    <Row label="Father" value={val(form.father_name)} />
                                    <Row label="Occupation" value={val(form.father_occupation)} />
                                    <Row label="Contact" value={val(form.father_contact)} />
                                    <Row label="Mother" value={val(form.mother_name)} />
                                    <Row label="Occupation" value={val(form.mother_occupation)} />
                                    <Row label="Contact" value={val(form.mother_contact)} />
                                    <Row label="Guardian" value={val(form.guardian_name)} />
                                    <Row label="Occupation" value={val(form.guardian_occupation)} />
                                    <Row label="Contact" value={val(form.guardian_contact)} />
                                </div>
                            </Card>

                            <Card title="Hospital, Doctor & Emergency Contact">
                                <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                                    <Row label="Hospital of Choice" value={val(form.hospital_choice)} />
                                    <Row label="Hospital Address" value={val(form.hospital_address)} />
                                    <Row label="Hospital Contact" value={val(form.hospital_contact)} />
                                    <Row label="Pediatrician / Family Doctor" value={val(form.doctor_name)} />
                                    <Row label="Person to Notify" value={val(form.emergency_person)} />
                                    <Row label="Contact" value={val(form.emergency_contact)} />
                                    <Row label="Relation" value={val(form.emergency_relation)} />
                                    <Row label="Address" value={val(form.emergency_address)} />
                                </div>
                            </Card>

                            <Card title="A. Past Medical History">
                                <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                    {PAST_HISTORY.map((item) => (
                                        <p key={item.key} className="flex justify-between gap-3">
                                            <span className="min-w-0 break-words text-gray-600">{item.label}</span>
                                            <span
                                                className={`shrink-0 rounded-full px-2 text-sm font-semibold leading-5 ${past[item.key] === "yes" ? "bg-red-100 text-red-700" : "text-gray-600"
                                                    }`}
                                            >
                                                {answerLabel(past[item.key])}
                                            </span>
                                        </p>
                                    ))}
                                </div>
                                {form.past_others && (
                                    <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-900">
                                        <span className="font-semibold text-gray-600">Others:</span>{" "}
                                        {form.past_others}
                                    </p>
                                )}
                            </Card>

                            <Card title="B. Family Medical History">
                                {/* Tatlong makikitid na column lang ito, kaya table pa rin sa mobile; may scroll kung masikip */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#f6faf8] text-gray-600">
                                            <tr>
                                                <th className="px-2 py-2 font-medium md:px-3">Disease</th>
                                                <th className="px-2 py-2 font-medium md:px-3">Answer</th>
                                                <th className="px-2 py-2 font-medium md:px-3">Relation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {FAMILY_HISTORY.map((item) => (
                                                <tr key={item.key} className="border-t border-gray-100">
                                                    <td className="px-2 py-2 text-gray-900 md:px-3">{item.label}</td>
                                                    <td className="px-2 py-2 font-semibold text-gray-600 md:px-3">
                                                        {answerLabel(family[item.key]?.answer)}
                                                    </td>
                                                    <td className="break-words px-2 py-2 text-gray-600 md:px-3">
                                                        {val(family[item.key]?.relation)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            <Card title="C. Psychological History">
                                <div className="space-y-2">
                                    {PSYCHOLOGICAL.map((item) => (
                                        <p key={item.key} className="break-words text-sm">
                                            <span className="font-semibold text-gray-600">{item.label}:</span>{" "}
                                            <span className="text-gray-900">
                                                {answerLabel(psych[item.key]?.answer)}
                                            </span>
                                            {psych[item.key]?.details && (
                                                <span className="text-gray-600"> — {psych[item.key]?.details}</span>
                                            )}
                                        </p>
                                    ))}
                                </div>
                            </Card>

                            <Card title="D. Other Medical Information">
                                {Object.keys(other).length === 0 ? (
                                    <p className="text-sm text-gray-600">No entries.</p>
                                ) : (
                                    <div className="grid gap-x-8 gap-y-1.5 md:grid-cols-2">
                                        {Object.entries(other).map(([key, value]) => (
                                            <Row key={key} label={key.replace(/_/g, " ")} value={value} />
                                        ))}
                                    </div>
                                )}
                            </Card>

                            <Card title="E. Review of System">
                                <p className="-mt-2 mb-4 text-sm text-gray-600">
                                    Only items with an answer are shown.
                                </p>
                                <div className="space-y-5">
                                    {REVIEW_OF_SYSTEM.map((group) => {
                                        const answered = group.items.filter((item) => ros[item.key]?.answer);
                                        if (answered.length === 0) return null;
                                        return (
                                            <div key={group.key}>
                                                <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                                                    {group.title}
                                                </h4>
                                                <div className="mt-2 space-y-1">
                                                    {answered.map((item) => (
                                                        <p key={item.key} className="flex justify-between gap-3 text-sm">
                                                            <span className="min-w-0 break-words text-gray-600">{item.label}</span>
                                                            <span
                                                                className={`shrink-0 font-semibold ${ros[item.key]?.answer === "yes"
                                                                    ? "text-red-600"
                                                                    : "text-gray-600"
                                                                    }`}
                                                            >
                                                                {answerLabel(ros[item.key]?.answer)}
                                                                {ros[item.key]?.age ? ` · age ${ros[item.key]?.age}` : ""}
                                                            </span>
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                            <Card title="Consent for Treatment">
                                <div className="grid gap-x-8 gap-y-2 md:grid-cols-3">
                                    <Row label="Parent / Guardian" value={val(form.consent_name)} />
                                    <Row label="Relationship" value={val(form.consent_relationship)} />
                                    <Row label="Date" value={fmt(form.consent_date)} />
                                </div>
                                {form.updated_by && (
                                    <p className="no-print mt-4 text-sm text-gray-600">
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