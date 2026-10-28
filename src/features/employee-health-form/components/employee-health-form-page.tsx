import { redirect } from "next/navigation";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canManageRecords } from "@/lib/permissions";
import {
    FAMILY_HISTORY,
    PAST_HISTORY,
    PHYSICAL_EXAM_ITEMS,
    PSYCHOLOGICAL,
    REVIEW_OF_SYSTEM,
} from "@/features/employee-health-form/form-data";
import { addLabExam, addPhysicalExam, deleteLabExam, deletePhysicalExam } from "@/features/employee-health-form/actions";
import PrintButton from "./print-button";
import ConfirmLink from "@/components/shared/confirm-link";
import PrintHeader from "@/components/layout/print-header";
import FlashMessage from "@/components/shared/flash-message";
import PersonPicker from "@/components/shared/person-picker";

const BASE = "/dashboard/employee-health-form";

type EmployeeRow = {
    employee_id: number;
    employee_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    department: string | null;
    position: string | null;
    date_of_birth: Date | null;
    gender: string | null;
    has_form: boolean;
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
    consent_date: Date | null;
    updated_by: string | null;
    updated_at: Date | null;
};

type PhysicalExam = {
    exam_id: number;
    exam_date: Date;
    findings: Record<string, string> | null;
    physician_signature: string | null;
};

type LabExam = {
    lab_id: number;
    exam_date: Date;
    findings: string | null;
    recommendations: string | null;
    physician_signature: string | null;
};

type Props = {
    searchParams: Promise<{ q?: string; employee?: string; saved?: string }>;
};

// text-base sa mobile para hindi mag-zoom ang iOS kapag nag-focus sa input
const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-2 text-base text-gray-900 outline-none focus:border-[#15664f] md:h-9 md:text-sm";
const textareaClass =
    "w-full rounded-lg border border-gray-300 bg-white p-3 text-base text-gray-900 outline-none focus:border-[#15664f] md:text-sm";

function fmt(date: Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
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
            <h3 className="border-l-4 border-[#15664f] pl-3 text-sm font-semibold uppercase tracking-wide text-gray-900">{title}</h3>
            <div className="mt-3 md:mt-4">{children}</div>
        </div>
    );
}

export default async function EmployeeHealthFormPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", employee: employeeNumber = "", saved } = await searchParams;
    const canEdit = canManageRecords(session.role);
    const like = `%${q}%`;

    const employees = await prisma.$queryRaw<EmployeeRow[]>`
    SELECT e.employee_id, e.employee_number, e.last_name, e.first_name, e.middle_name, e.department, e.position, e.date_of_birth, e.gender,
           EXISTS (SELECT 1 FROM employee_health_forms f WHERE f.employee_id = e.employee_id) AS has_form
    FROM employees e
    WHERE e.archived_at IS NULL
      AND (
        ${q}::text = ''
        OR e.employee_number ILIKE ${like}
        OR e.last_name ILIKE ${like}
        OR e.first_name ILIKE ${like}
      )
    ORDER BY e.last_name, e.first_name
    LIMIT 50
  `;

    const selected = employeeNumber
        ? employees.find((e) => e.employee_number === employeeNumber)
        : undefined;

    let form: FormRow | undefined;
    let physicals: PhysicalExam[] = [];
    let labs: LabExam[] = [];

    if (selected) {
        const rows = await prisma.$queryRaw<FormRow[]>`
      SELECT * FROM employee_health_forms WHERE employee_id = ${selected.employee_id} LIMIT 1
    `;
        form = rows[0];

        physicals = await prisma.$queryRaw<PhysicalExam[]>`
      SELECT exam_id, exam_date, findings, physician_signature
      FROM employee_physical_exams
      WHERE employee_id = ${selected.employee_id}
      ORDER BY exam_date ASC
    `;

        labs = await prisma.$queryRaw<LabExam[]>`
      SELECT lab_id, exam_date, findings, recommendations, physician_signature
      FROM employee_lab_exams
      WHERE employee_id = ${selected.employee_id}
      ORDER BY exam_date ASC
    `;
    }

    const past = form?.past_history ?? {};
    const family = form?.family_history ?? {};
    const psych = form?.psychological ?? {};
    const other = form?.other_medical ?? {};
    const ros = form?.review_of_system ?? {};
    // "en-CA" ay nagbibigay ng YYYY-MM-DD; naka-Manila para tama ang petsa kahit madaling-araw
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

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
                        <h1 className="text-2xl font-bold text-[#10523f] md:text-3xl">Employee Health Form</h1>
                        <p className="text-sm text-gray-600">Medical history and medical examination of each employee.</p>
                    </div>
                </div>

                {selected && canEdit && (
                    <div className="flex flex-wrap gap-3">
                        <PrintButton />
                        <ConfirmLink
                            href={`${BASE}/edit?employee=${encodeURIComponent(selected.employee_number)}`}
                            title={form ? "Edit form" : "Fill out form"}
                            message={`${form ? "Edit" : "Fill out"} the form of ${selected.first_name} ${selected.last_name} (${selected.employee_number})?`}
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
                    <FlashMessage clearParam="saved">Health record saved.</FlashMessage>
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
                    placeholder="Search name or employee number..."
                    heading="Employees"
                    activeKey={employeeNumber}
                    confirmTitle="View health form"
                    emptyText="No employees found."
                    items={employees.map((e) => ({
                        key: e.employee_number,
                        href: `${BASE}?q=${encodeURIComponent(q)}&employee=${encodeURIComponent(e.employee_number)}`,
                        name: `${e.first_name} ${e.last_name}`,
                        initials: `${e.first_name[0] ?? ""}${e.last_name[0] ?? ""}`.toUpperCase(),
                        sub: `${e.employee_number}${e.position ? ` · ${e.position}` : ""}`,
                        hasForm: Boolean(e.has_form),
                        message: `Open the health form of ${e.first_name} ${e.last_name} (${e.employee_number})? This contains confidential medical information.`,
                    }))}
                />

                <section className="min-w-0 space-y-4 lg:space-y-6">
                    {!selected && (
                        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-8 text-center md:p-16">
                            <ClipboardList className="h-12 w-12 text-[#15664f]/40" />
                            <p className="mt-3 text-base font-semibold text-gray-800">No employee selected</p>
                            <p className="mt-1 text-sm text-gray-600">
                                Select an employee <span className="lg:hidden">from the list above</span>
                                <span className="hidden lg:inline">on the left</span> to view the form.
                            </p>
                        </div>
                    )}

                    {selected && (
                        <>
                            <PrintHeader />
                            <div className="rounded-xl border-2 border-[#cfe5d9] bg-white p-5 shadow-md shadow-[#15664f]/10 md:p-6">
                                <h2 className="text-center text-base font-bold uppercase tracking-wide text-[#15664f] md:text-lg">
                                    Employee&apos;s Health Record
                                </h2>
                                <div className="mt-4 grid gap-x-8 gap-y-2 md:mt-5 md:grid-cols-2">
                                    <Row
                                        label="Name"
                                        value={`${selected.first_name}${selected.middle_name ? ` ${selected.middle_name}` : ""
                                            } ${selected.last_name}`}
                                    />
                                    <Row label="Employee Number" value={selected.employee_number} />
                                    <Row label="Position" value={val(selected.position)} />
                                    <Row label="Department" value={val(selected.department)} />
                                    <Row label="Sex" value={val(form?.sex ?? selected.gender)} />
                                    <Row
                                        label="Date of Birth"
                                        value={fmt(form?.date_of_birth ?? selected.date_of_birth)}
                                    />
                                    <Row label="Birthplace" value={val(form?.birthplace)} />
                                    <Row label="Nationality" value={val(form?.nationality)} />
                                    <Row label="Religion" value={val(form?.religion)} />
                                    <Row label="Contact Number" value={val(form?.contact_number)} />
                                    <div className="md:col-span-2">
                                        <Row label="Address" value={val(form?.address)} />
                                    </div>
                                </div>
                            </div>

                            {!form && (
                                <div className="rounded-xl border-2 border-dashed border-[#cfe5d9] bg-white p-6 text-center md:p-8">
                                    <p className="text-sm text-gray-600 md:text-base">
                                        No health form yet for this employee.
                                    </p>
                                    {canEdit && (
                                        <div className="mt-4 flex justify-center">
                                            <ConfirmLink
                                                href={`${BASE}/edit?employee=${encodeURIComponent(selected.employee_number)}`}
                                                title="Fill out form"
                                                message={`Fill out the form of ${selected.first_name} ${selected.last_name} (${selected.employee_number})?`}
                                                confirmLabel="Continue"
                                                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f]"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Fill Out Form
                                            </ConfirmLink>
                                        </div>
                                    )}
                                </div>
                            )}

                            {form && (
                                <>
                                    <Card title="Parents">
                                        <div className="grid gap-x-8 gap-y-2 md:grid-cols-3">
                                            <Row label="Father" value={val(form.father_name)} />
                                            <Row label="Occupation" value={val(form.father_occupation)} />
                                            <Row label="Contact" value={val(form.father_contact)} />
                                            <Row label="Mother" value={val(form.mother_name)} />
                                            <Row label="Occupation" value={val(form.mother_occupation)} />
                                            <Row label="Contact" value={val(form.mother_contact)} />
                                        </div>
                                    </Card>

                                    <Card title="Hospital, Doctor & Emergency Contact">
                                        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                                            <Row label="Hospital of Choice" value={val(form.hospital_choice)} />
                                            <Row label="Hospital Address" value={val(form.hospital_address)} />
                                            <Row label="Hospital Contact" value={val(form.hospital_contact)} />
                                            <Row label="Family Doctor" value={val(form.doctor_name)} />
                                            <Row label="Person to Notify" value={val(form.emergency_person)} />
                                            <Row label="Contact" value={val(form.emergency_contact)} />
                                            <Row label="Relation" value={val(form.emergency_relation)} />
                                            <Row label="Address" value={val(form.emergency_address)} />
                                        </div>
                                    </Card>

                                    <Card title="A. Past Medical History">
                                        <div className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                            {PAST_HISTORY.map((item) => (
                                                <p key={item.key} className="flex items-start justify-between gap-3">
                                                    <span className="min-w-0 break-words text-gray-600">{item.label}</span>
                                                    <span
                                                        className={`shrink-0 font-semibold ${past[item.key] === "yes" ? "text-red-600" : "text-gray-600"
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
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-[#f6faf8] text-gray-600">
                                                    <tr>
                                                        <th className="px-2 py-2 font-medium sm:px-3">Disease</th>
                                                        <th className="px-2 py-2 font-medium sm:px-3">Answer</th>
                                                        <th className="px-2 py-2 font-medium sm:px-3">Relation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {FAMILY_HISTORY.map((item) => (
                                                        <tr key={item.key} className="border-t border-gray-100">
                                                            <td className="px-2 py-2 text-gray-900 sm:px-3">{item.label}</td>
                                                            <td className="px-2 py-2 font-semibold text-gray-600 sm:px-3">
                                                                {answerLabel(family[item.key]?.answer)}
                                                            </td>
                                                            <td className="px-2 py-2 text-gray-600 sm:px-3">
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
                                                                <p
                                                                    key={item.key}
                                                                    className="flex items-start justify-between gap-3 text-sm"
                                                                >
                                                                    <span className="min-w-0 break-words text-gray-600">
                                                                        {item.label}
                                                                    </span>
                                                                    <span
                                                                        className={`shrink-0 text-right font-semibold ${ros[item.key]?.answer === "yes"
                                                                            ? "text-red-600"
                                                                            : "text-gray-600"
                                                                            }`}
                                                                    >
                                                                        {answerLabel(ros[item.key]?.answer)}
                                                                        {ros[item.key]?.age
                                                                            ? ` · age ${ros[item.key]?.age}`
                                                                            : ""}
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
                                        <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                                            <Row label="Employee" value={val(form.consent_name)} />
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

                            <Card title="Part II-A. Physical Examination">
                                {physicals.length === 0 ? (
                                    <p className="text-sm text-gray-600">No physical examination recorded yet.</p>
                                ) : (
                                    <>
                                        {/* Matrix ito (items x petsa), kaya i-swipe pakaliwa/pakanan sa mobile.
                                            Naka-sticky ang unang column para hindi mawala ang pangalan ng item. */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-[#f6faf8] text-gray-600">
                                                    <tr>
                                                        <th className="sticky left-0 bg-gray-50 px-3 py-2 font-medium">Item</th>
                                                        {physicals.map((exam) => (
                                                            <th key={exam.exam_id} className="whitespace-nowrap px-3 py-2 font-medium">
                                                                {fmt(exam.exam_date)}
                                                                {canEdit && (
                                                                    <form action={deletePhysicalExam} className="no-print mt-1">
                                                                        <input type="hidden" name="examId" value={exam.exam_id} />
                                                                        <button
                                                                            type="submit"
                                                                            className="inline-flex items-center gap-1 py-1 text-sm font-normal text-red-600 hover:underline"
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                            Delete
                                                                        </button>
                                                                    </form>
                                                                )}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {PHYSICAL_EXAM_ITEMS.map((item) => (
                                                        <tr key={item.key} className="border-t border-gray-100">
                                                            <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-gray-600">
                                                                {item.label}
                                                            </td>
                                                            {physicals.map((exam) => (
                                                                <td key={exam.exam_id} className="px-3 py-2 text-gray-900">
                                                                    {exam.findings?.[item.key] ?? "—"}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                    <tr className="border-t-2 border-gray-300">
                                                        <td className="sticky left-0 bg-white px-3 py-2 font-semibold text-gray-800">
                                                            Physician&apos;s Signature
                                                        </td>
                                                        {physicals.map((exam) => (
                                                            <td key={exam.exam_id} className="px-3 py-2 text-gray-900">
                                                                {val(exam.physician_signature)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="no-print mt-2 text-sm text-gray-600 md:hidden">
                                            Swipe pakaliwa o pakanan para makita ang ibang petsa.
                                        </p>
                                    </>
                                )}

                                {canEdit && (
                                    <details className="no-print mt-5 rounded-lg border border-gray-200 p-3 md:p-4">
                                        <summary className="flex cursor-pointer items-center gap-2 py-1 text-sm font-semibold text-[#15664f]">
                                            <Plus className="h-4 w-4" />
                                            Add Physical Examination
                                        </summary>
                                        <form action={addPhysicalExam} className="mt-4 space-y-4">
                                            <input
                                                type="hidden"
                                                name="employeeNumber"
                                                value={selected.employee_number}
                                            />
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <label className="block space-y-1.5">
                                                    <span className="text-sm font-medium text-gray-600">Exam Date *</span>
                                                    <input
                                                        name="examDate"
                                                        type="date"
                                                        defaultValue={today}
                                                        required
                                                        suppressHydrationWarning
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <label className="block space-y-1.5">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        Physician&apos;s Signature
                                                    </span>
                                                    <input
                                                        name="physicianSignature"
                                                        maxLength={100}
                                                        suppressHydrationWarning
                                                        className={inputClass}
                                                    />
                                                </label>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {PHYSICAL_EXAM_ITEMS.map((item) => (
                                                    <label key={item.key} className="block space-y-1">
                                                        <span className="text-sm font-medium text-gray-600">
                                                            {item.label}
                                                        </span>
                                                        <input
                                                            name={`pe_${item.key}`}
                                                            suppressHydrationWarning
                                                            className={inputClass}
                                                        />
                                                    </label>
                                                ))}
                                            </div>

                                            <div className="flex sm:justify-end">
                                                <button
                                                    type="submit"
                                                    suppressHydrationWarning
                                                    className="h-10 w-full rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] sm:w-auto"
                                                >
                                                    Save Examination
                                                </button>
                                            </div>
                                        </form>
                                    </details>
                                )}
                            </Card>

                            <Card title="Part II-B. Laboratory Examination">
                                {labs.length === 0 ? (
                                    <p className="text-sm text-gray-600">No laboratory examination recorded yet.</p>
                                ) : (
                                    <>
                                        {/* MOBILE: card list */}
                                        <ul className="space-y-2 md:hidden">
                                            {labs.map((lab) => (
                                                <li key={lab.lab_id} className="rounded-lg border border-gray-100 p-3">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {fmt(lab.exam_date)}
                                                    </p>
                                                    <dl className="mt-2 space-y-1">
                                                        <div className="text-sm">
                                                            <dt className="text-sm text-gray-600">Findings / Conclusions</dt>
                                                            <dd className="whitespace-pre-wrap break-words text-gray-900">
                                                                {val(lab.findings)}
                                                            </dd>
                                                        </div>
                                                        <div className="text-sm">
                                                            <dt className="text-sm text-gray-600">Recommendations</dt>
                                                            <dd className="whitespace-pre-wrap break-words text-gray-900">
                                                                {val(lab.recommendations)}
                                                            </dd>
                                                        </div>
                                                        <div className="text-sm">
                                                            <dt className="text-sm text-gray-600">Physician&apos;s Signature</dt>
                                                            <dd className="break-words text-gray-900">
                                                                {val(lab.physician_signature)}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                    {canEdit && (
                                                        <div className="no-print mt-3 border-t border-gray-100 pt-2">
                                                            <form action={deleteLabExam}>
                                                                <input type="hidden" name="labId" value={lab.lab_id} />
                                                                <button
                                                                    type="submit"
                                                                    className="inline-flex items-center gap-1 py-1 text-sm font-medium text-red-600 hover:underline"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    Delete
                                                                </button>
                                                            </form>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>

                                        {/* DESKTOP: table */}
                                        <div className="hidden overflow-x-auto md:block">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-[#f6faf8] text-gray-600">
                                                    <tr>
                                                        <th className="whitespace-nowrap px-3 py-2 font-medium">Date</th>
                                                        <th className="px-3 py-2 font-medium">Findings / Conclusions</th>
                                                        <th className="px-3 py-2 font-medium">Recommendations</th>
                                                        <th className="px-3 py-2 font-medium">Physician&apos;s Signature</th>
                                                        {canEdit && <th className="no-print px-3 py-2 font-medium" />}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {labs.map((lab) => (
                                                        <tr key={lab.lab_id} className="border-t border-gray-100 align-top">
                                                            <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                                                                {fmt(lab.exam_date)}
                                                            </td>
                                                            <td className="whitespace-pre-wrap px-3 py-2 text-gray-900">
                                                                {val(lab.findings)}
                                                            </td>
                                                            <td className="whitespace-pre-wrap px-3 py-2 text-gray-900">
                                                                {val(lab.recommendations)}
                                                            </td>
                                                            <td className="px-3 py-2 text-gray-900">
                                                                {val(lab.physician_signature)}
                                                            </td>
                                                            {canEdit && (
                                                                <td className="no-print px-3 py-2">
                                                                    <form action={deleteLabExam}>
                                                                        <input type="hidden" name="labId" value={lab.lab_id} />
                                                                        <button
                                                                            type="submit"
                                                                            className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                            Delete
                                                                        </button>
                                                                    </form>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                                {canEdit && (
                                    <details className="no-print mt-5 rounded-lg border border-gray-200 p-3 md:p-4">
                                        <summary className="flex cursor-pointer items-center gap-2 py-1 text-sm font-semibold text-[#15664f]">
                                            <Plus className="h-4 w-4" />
                                            Add Laboratory Examination
                                        </summary>
                                        <form action={addLabExam} className="mt-4 space-y-4">
                                            <input
                                                type="hidden"
                                                name="employeeNumber"
                                                value={selected.employee_number}
                                            />
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <label className="block space-y-1.5">
                                                    <span className="text-sm font-medium text-gray-600">Exam Date *</span>
                                                    <input
                                                        name="examDate"
                                                        type="date"
                                                        defaultValue={today}
                                                        required
                                                        suppressHydrationWarning
                                                        className={inputClass}
                                                    />
                                                </label>
                                                <label className="block space-y-1.5">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        Physician&apos;s Signature
                                                    </span>
                                                    <input
                                                        name="physicianSignature"
                                                        maxLength={100}
                                                        suppressHydrationWarning
                                                        className={inputClass}
                                                    />
                                                </label>
                                            </div>
                                            <label className="block space-y-1.5">
                                                <span className="text-sm font-medium text-gray-600">
                                                    Findings / Conclusions
                                                </span>
                                                <textarea
                                                    name="findings"
                                                    rows={3}
                                                    suppressHydrationWarning
                                                    className={textareaClass}
                                                />
                                            </label>
                                            <label className="block space-y-1.5">
                                                <span className="text-sm font-medium text-gray-600">Recommendations</span>
                                                <textarea
                                                    name="recommendations"
                                                    rows={3}
                                                    suppressHydrationWarning
                                                    className={textareaClass}
                                                />
                                            </label>
                                            <div className="flex sm:justify-end">
                                                <button
                                                    type="submit"
                                                    suppressHydrationWarning
                                                    className="h-10 w-full rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] sm:w-auto"
                                                >
                                                    Save Examination
                                                </button>
                                            </div>
                                        </form>
                                    </details>
                                )}
                            </Card>
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}