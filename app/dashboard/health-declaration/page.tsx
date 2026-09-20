import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canManageRecords } from "@/lib/permissions";
import { GOING_HOME, SYMPTOMS } from "./form-data";
import PrintButton from "./print-button";

const BASE = "/dashboard/health-declaration";

type StudentRow = {
    student_id: number;
    student_number: string;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    grade_level: string | null;
    program: string | null;
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
        timeZone: "UTC",
    });
}

function val(value: string | null | undefined) {
    return value && value.trim() ? value : "—";
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

export default async function HealthDeclarationPage({ searchParams }: Props) {
    const session = await getSession();
    if (!session) redirect("/login");

    const { q = "", student: studentNumber = "", saved } = await searchParams;
    const canEdit = canManageRecords(session.role);
    const like = `%${q}%`;

    const students = await prisma.$queryRaw<StudentRow[]>`
    SELECT student_id, student_number, last_name, first_name, middle_name,
           grade_level, program
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
                    <h1 className="text-3xl font-semibold text-gray-900">Health Declaration</h1>
                    <p className="mt-1 text-gray-600">
                        Student Information and Health Status Declaration.
                    </p>
                </div>
                {selected && (
                    <div className="flex gap-3">
                        <PrintButton />
                        {canEdit && (
                            <Link
                                href={`${BASE}/edit?student=${encodeURIComponent(selected.student_number)}`}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white hover:bg-[#10523f]"
                            >
                                <Pencil className="h-4 w-4" />
                                {form ? "Edit Form" : "Fill Out Form"}
                            </Link>
                        )}
                    </div>
                )}
            </div>

            {saved === "1" && (
                <p className="no-print rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Declaration saved.
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
                                <Link
                                    key={s.student_id}
                                    href={`${BASE}?q=${encodeURIComponent(q)}&student=${encodeURIComponent(
                                        s.student_number
                                    )}`}
                                    className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-[#15664f] text-white" : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                >
                                    <span className="block font-medium">
                                        {s.last_name}, {s.first_name}
                                    </span>
                                    <span
                                        className={`block text-xs ${active ? "text-white/80" : "text-gray-500"}`}
                                    >
                                        {s.student_number}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </aside>

                <section className="space-y-6">
                    {!selected && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <p className="text-gray-500">
                                Select a student on the left to view the declaration.
                            </p>
                        </div>
                    )}

                    {selected && !form && (
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                            <p className="text-gray-500">No declaration yet for this student.</p>
                            {canEdit && (
                                <Link
                                    href={`${BASE}/edit?student=${encodeURIComponent(
                                        selected.student_number
                                    )}`}
                                    className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f]"
                                >
                                    Fill Out Form
                                </Link>
                            )}
                        </div>
                    )}

                    {selected && form && (
                        <>
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-center text-lg font-bold uppercase tracking-wide text-gray-900">
                                    Student Information and Health Status Declaration
                                </h2>
                                {form.school_year && (
                                    <p className="mt-1 text-center text-sm font-semibold text-gray-700">
                                        School Year {form.school_year}
                                    </p>
                                )}
                                <div className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
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
                                                    {item.label}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {form.symptom_notes && (
                                    <p className="mt-4 whitespace-pre-wrap text-sm text-gray-900">
                                        <span className="font-semibold text-gray-700">Notes:</span>{" "}
                                        {form.symptom_notes}
                                    </p>
                                )}
                            </Card>

                            <Card title="Requirements Submitted">
                                <div className="space-y-2 text-sm">
                                    <p className="flex items-center gap-2">
                                        <span
                                            className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${form.vaccination_submitted
                                                ? "border-[#15664f] bg-[#15664f] text-white"
                                                : "border-gray-300 bg-white text-transparent"
                                                }`}
                                        >
                                            ✓
                                        </span>
                                        <span className="text-gray-700">Vaccination record</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <span
                                            className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${form.medical_cert_submitted
                                                ? "border-[#15664f] bg-[#15664f] text-white"
                                                : "border-gray-300 bg-white text-transparent"
                                                }`}
                                        >
                                            ✓
                                        </span>
                                        <span className="text-gray-700">Medical certification</span>
                                    </p>
                                </div>

                                <p className="mt-4 whitespace-pre-wrap text-sm text-gray-900">
                                    <span className="font-semibold text-gray-700">Medicines:</span>{" "}
                                    {val(form.medicines)}
                                </p>
                            </Card>

                            <Card title="Certification of Parent / Guardian">
                                <div className="flex flex-wrap items-end justify-between gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="font-semibold text-gray-900 underline">
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