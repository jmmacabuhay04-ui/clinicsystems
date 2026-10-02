import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import {
    FAMILY_HISTORY,
    PAST_HISTORY,
    PSYCHOLOGICAL,
    REVIEW_OF_SYSTEM,
} from "./form-data";
import PrintButton from "./print-button";
import ConfirmLink from "@/components/confirm-link";
import PrintHeader from "@/components/print-header";

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
};

type FormRow = {
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
    searchParams: Promise<{ q?: string; student?: string; saved?: string }>;
};

function fmt(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
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
        <p className="text-sm">
            <span className="font-semibold text-gray-700">{label}:</span>{" "}
            <span className="text-gray-900">{value}</span>
        </p>
    );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h3>
            <div className="mt-4">{children}</div>
        </div>
    );
}

export default async function StudentHealthFormPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", student: studentNumber = "", saved } = await searchParams;
    const canEdit = canManageRecords(session.role);
    const like = `%${q}%`;

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program, date_of_birth, gender
    FROM students
    WHERE archived_at IS NULL
      AND (
        ${q}::text = ''
        OR student_number ILIKE ${like}
        OR last_name ILIKE ${like}
        OR first_name ILIKE ${like}
      )
    ORDER BY student_number
    LIMIT 50
  `;

    const selected = studentNumber
        ? students.find((s) => s.student_number === studentNumber)
        : undefined;

    let form: FormRow | undefined;
    if (selected) {
        const rows = await prisma.$queryRaw<FormRow[]>`
      SELECT * FROM student_health_forms WHERE student_id = ${selected.student_id} LIMIT 1
    `;
        form = rows[0];
    }

    const past = form?.past_history ?? {};
    const family = form?.family_history ?? {};
    const psych = form?.psychological ?? {};
    const other = form?.other_medical ?? {};
    const ros = form?.review_of_system ?? {};

    return (
        <main className="space-y-6 p-6 md:p-8">
            <style
                dangerouslySetInnerHTML={{
                    __html: `@media print {
            aside, .no-print { display: none !important; }
            body { background: #ffffff !important; }
            main { padding: 0 !important; }
          }`,
                }}
            />

            <div className="no-print flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Student Health Form</h1>
                    <p className="mt-1 text-gray-600">
                        Student&apos;s Health Record — medical history, review of system, and consent.
                    </p>
                </div>
                {selected && canEdit && (
                    <div className="flex gap-3">
                        <PrintButton />
                        <ConfirmLink
                            href={`${BASE}/edit?student=${encodeURIComponent(selected.student_number)}`}
                            title={form ? "Edit form" : "Fill out form"}
                            message={`${form ? "Edit" : "Fill out"} the form of ${selected.first_name} ${selected.last_name} (${selected.student_number})?`}
                            confirmLabel={form ? "Edit" : "Continue"}
                            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                        >
                            <Pencil className="h-4 w-4" />
                            {form ? "Edit Form" : "Fill Out Form"}
                        </ConfirmLink>
                    </div>
                )}
            </div>

            {saved === "1" && (
                <p className="no-print rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Health record saved.
                </p>
            )}
            {!canEdit && (
                <p className="no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    View only. You can view this form but cannot edit or print it.
                </p>
            )}

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <aside className="no-print rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <form method="get" className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            name="q"
                            defaultValue={q}
                            placeholder="Search student..."
                            suppressHydrationWarning
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </form>

                    <div className="mt-4 max-h-[560px] space-y-1 overflow-y-auto">
                        {students.length === 0 && (
                            <p className="p-3 text-sm text-gray-500">No students found.</p>
                        )}
                        {students.map((s) => {
                            const active = s.student_number === studentNumber;
                            return (
                                <ConfirmLink
                                    key={s.student_id}
                                    href={`${BASE}?q=${encodeURIComponent(q)}&student=${encodeURIComponent(s.student_number)}`}
                                    title="View health form"
                                    message={`Open the health form of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information.`}
                                    className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-[#15664f] text-white" : "text-gray-700 hover:bg-gray-100"}`}
                                >
                                    <span className="block font-medium">
                                        {s.last_name}, {s.first_name}
                                    </span>
                                    <span className={`block text-xs ${active ? "text-white/80" : "text-gray-500"}`}>
                                        {s.student_number}
                                    </span>
                                </ConfirmLink>
                            );
                        })}
                    </div>
                </aside>

                <section className="space-y-6">
                    {!selected && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <p className="text-gray-500">Select a student on the left to view the form.</p>
                        </div>
                    )}

                    {selected && !form && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <p className="text-gray-500">No health form yet for this student.</p>
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
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-center text-lg font-bold uppercase tracking-wide text-gray-900">
                                    Student&apos;s Health Record
                                </h2>
                                <div className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
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
                                            <span className="text-gray-700">{item.label}</span>
                                            <span
                                                className={`font-semibold ${past[item.key] === "yes" ? "text-red-600" : "text-gray-500"
                                                    }`}
                                            >
                                                {answerLabel(past[item.key])}
                                            </span>
                                        </p>
                                    ))}
                                </div>
                                {form.past_others && (
                                    <p className="mt-4 whitespace-pre-wrap text-sm text-gray-900">
                                        <span className="font-semibold text-gray-700">Others:</span>{" "}
                                        {form.past_others}
                                    </p>
                                )}
                            </Card>

                            <Card title="B. Family Medical History">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-gray-700">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Disease</th>
                                                <th className="px-3 py-2 font-medium">Answer</th>
                                                <th className="px-3 py-2 font-medium">Relation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {FAMILY_HISTORY.map((item) => (
                                                <tr key={item.key} className="border-t border-gray-100">
                                                    <td className="px-3 py-2 text-gray-900">{item.label}</td>
                                                    <td className="px-3 py-2 font-semibold text-gray-700">
                                                        {answerLabel(family[item.key]?.answer)}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-700">
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
                                        <p key={item.key} className="text-sm">
                                            <span className="font-semibold text-gray-700">{item.label}:</span>{" "}
                                            <span className="text-gray-900">
                                                {answerLabel(psych[item.key]?.answer)}
                                            </span>
                                            {psych[item.key]?.details && (
                                                <span className="text-gray-700"> — {psych[item.key]?.details}</span>
                                            )}
                                        </p>
                                    ))}
                                </div>
                            </Card>

                            <Card title="D. Other Medical Information">
                                {Object.keys(other).length === 0 ? (
                                    <p className="text-sm text-gray-500">No entries.</p>
                                ) : (
                                    <div className="grid gap-x-8 gap-y-1.5 md:grid-cols-2">
                                        {Object.entries(other).map(([key, value]) => (
                                            <Row key={key} label={key.replace(/_/g, " ")} value={value} />
                                        ))}
                                    </div>
                                )}
                            </Card>

                            <Card title="E. Review of System">
                                <p className="-mt-2 mb-4 text-xs text-gray-500">
                                    Only items with an answer are shown.
                                </p>
                                <div className="space-y-5">
                                    {REVIEW_OF_SYSTEM.map((group) => {
                                        const answered = group.items.filter((item) => ros[item.key]?.answer);
                                        if (answered.length === 0) return null;
                                        return (
                                            <div key={group.key}>
                                                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700">
                                                    {group.title}
                                                </h4>
                                                <div className="mt-2 space-y-1">
                                                    {answered.map((item) => (
                                                        <p key={item.key} className="flex justify-between gap-3 text-sm">
                                                            <span className="text-gray-700">{item.label}</span>
                                                            <span
                                                                className={`font-semibold ${ros[item.key]?.answer === "yes"
                                                                    ? "text-red-600"
                                                                    : "text-gray-500"
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