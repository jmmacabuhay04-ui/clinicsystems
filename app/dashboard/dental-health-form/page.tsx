import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageDentalForm } from "@/lib/permissions";
import { LEGEND, OCCLUSION, PERIODONTAL, TREATMENT } from "./chart-data";
import ToothGrid, { type ChartMap } from "./tooth-grid";
import PrintButton from "./print-button";
import ConfirmLink from "@/components/confirm-link";
import PrintHeader from "@/components/print-header";

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
        timeZone: "UTC",
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
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
                {items.map((item) => (
                    <p key={item.key} className="flex items-center gap-2">
                        <span
                            className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${checked[item.key]
                                ? "border-[#15664f] bg-[#15664f] text-white"
                                : "border-gray-300 bg-white text-transparent"
                                }`}
                        >
                            ✓
                        </span>
                        {item.label}
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
                    <h1 className="text-3xl font-semibold text-gray-900">Dental Health Form</h1>

                    <p className="mt-1 text-gray-600">
                        Student&apos;s Dental Health Record — tooth chart, findings, and treatment needed.
                    </p>
                </div>
                {selected && (
                    <div className="flex gap-3">
                        <PrintButton />
                        {canEdit && (
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
                        )}
                    </div>
                )}
            </div>

            {saved === "1" && (
                <p className="no-print rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Dental health record saved.
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
                                    title="View dental health record"
                                    message={`Open the dental health record of ${s.first_name} ${s.last_name} (${s.student_number})? This contains confidential medical information.`}
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
                            <p className="text-gray-500">
                                Select a student on the left to view their dental health record.
                            </p>
                        </div>
                    )}

                    {selected && (
                        <>
                            <PrintHeader />
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-center text-lg font-bold uppercase tracking-wide text-gray-900">
                                    Student&apos;s Dental Health Record
                                </h2>
                                <div className="mt-5 grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
                                    <p>
                                        <span className="font-semibold text-gray-700">Name:</span>{" "}
                                        <span className="text-gray-900">{fullName(selected)}</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-700">Date of Birth:</span>{" "}
                                        <span className="text-gray-900">{fmtDate(selected.date_of_birth)}</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-700">Level:</span>{" "}
                                        <span className="text-gray-900">
                                            {form?.level || selected.grade_level || "—"}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-700">Section:</span>{" "}
                                        <span className="text-gray-900">
                                            {form?.section || selected.program || "—"}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-700">Age:</span>{" "}
                                        <span className="text-gray-900">{form?.age ?? "—"}</span>
                                    </p>
                                    <p>
                                        <span className="font-semibold text-gray-700">Sex:</span>{" "}
                                        <span className="text-gray-900">
                                            {form?.sex || selected.gender || "—"}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            {!form ? (
                                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                                    <p className="text-gray-500">
                                        No dental health record yet for this student.
                                    </p>
                                    {canEdit && (
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
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                        <ToothGrid chart={chart} readOnly />

                                        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                                                Legend
                                            </h3>
                                            <div className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
                                                {LEGEND.map((item) => (
                                                    <p key={item.code}>
                                                        <span className="font-bold text-gray-900">{item.code}</span> –{" "}
                                                        {item.meaning}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                        <div className="grid gap-8 md:grid-cols-3">
                                            <CheckList
                                                title="Periodontal Condition"
                                                items={PERIODONTAL}
                                                checked={perio}
                                            />
                                            <CheckList title="Occlusion" items={OCCLUSION} checked={occ} />
                                            <CheckList title="Treatment Needed" items={TREATMENT} checked={tx} />
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                                            Remarks
                                        </h3>
                                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-900">
                                            {form.remarks || "—"}
                                        </p>

                                        <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-t border-gray-200 pt-5 text-sm">
                                            <p>
                                                <span className="font-semibold text-gray-700">
                                                    Date of Examination:
                                                </span>{" "}
                                                <span className="text-gray-900">{fmtDate(form.exam_date)}</span>
                                            </p>
                                            <div className="text-center">
                                                <p className="font-semibold text-gray-900 underline">
                                                    {form.examined_by || "—"}
                                                </p>
                                                <p className="text-xs text-gray-600">Examined by · School Dentist</p>
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