"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveHealthDeclaration, type DeclarationState } from "./actions";
import { GOING_HOME, SYMPTOMS } from "./form-data";

const initialState: DeclarationState = {};

const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

export type DeclarationValues = {
    studentNumber: string;
    studentName: string;
    text: Record<string, string>;
    symptoms: Record<string, boolean>;
    vaccinationSubmitted: boolean;
    medicalCertSubmitted: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

export default function HealthDeclarationEditor({
    values,
    cancelHref,
}: {
    values: DeclarationValues;
    cancelHref: string;
}) {
    const [state, formAction, pending] = useActionState(saveHealthDeclaration, initialState);
    const t = values.text;

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <input type="hidden" name="studentNumber" value={values.studentNumber} />

            <Section title="A. Student Information for Quick Reference">
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Learner's Full Name">
                        <input
                            value={values.studentName}
                            readOnly
                            suppressHydrationWarning
                            className={`${inputClass} bg-gray-50`}
                        />
                    </Field>
                    <Field label="Grade/Year Level & Section/Course">
                        <input
                            name="gradeSection"
                            defaultValue={t.gradeSection ?? ""}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label="Learner's Residence Address">
                            <input
                                name="residenceAddress"
                                defaultValue={t.residenceAddress ?? ""}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>
                    <Field label="School Year">
                        <input
                            name="schoolYear"
                            defaultValue={t.schoolYear ?? ""}
                            placeholder="e.g. 2026-2027"
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Contact Person in Case of Emergency">
                        <input
                            name="emergencyName"
                            defaultValue={t.emergencyName ?? ""}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Relationship to the Student">
                        <input
                            name="emergencyRelationship"
                            defaultValue={t.emergencyRelationship ?? ""}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Contact Number/s">
                        <input
                            name="emergencyNumbers"
                            defaultValue={t.emergencyNumbers ?? ""}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="mt-5">
                    <p className="text-sm font-medium text-gray-700">Learner&apos;s Means of Going Home</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {GOING_HOME.map((option) => (
                            <label key={option.key} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="radio"
                                    name="goingHome"
                                    value={option.key}
                                    defaultChecked={t.goingHome === option.key}
                                    suppressHydrationWarning
                                    className="h-4 w-4 accent-[#15664f]"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                    <div className="mt-3 max-w-md">
                        <Field label="If others, please specify">
                            <input
                                name="goingHomeOther"
                                defaultValue={t.goingHomeOther ?? ""}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </div>
            </Section>

            <Section title="B. Health Status Declaration">
                <p className="-mt-2 mb-4 text-xs text-gray-500">
                    Lagyan ng check ang mga sintomas na naranasan ng learner o ng kahit sinong kasambahay sa
                    nakaraang 14 na araw. Kung wala, iwanang blangko ang lahat.
                </p>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {SYMPTOMS.map((item) => (
                        <label key={item.key} className="flex items-start gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                name={`sym_${item.key}`}
                                defaultChecked={Boolean(values.symptoms[item.key])}
                                suppressHydrationWarning
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#15664f]"
                            />
                            {item.label}
                        </label>
                    ))}
                </div>

                <div className="mt-5">
                    <Field label="Notes / Details">
                        <textarea
                            name="symptomNotes"
                            defaultValue={t.symptomNotes ?? ""}
                            rows={3}
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
                </div>
            </Section>

            <Section title="Requirements Submitted">
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name="vaccinationSubmitted"
                            defaultChecked={values.vaccinationSubmitted}
                            suppressHydrationWarning
                            className="h-4 w-4 rounded border-gray-300 accent-[#15664f]"
                        />
                        Copy of vaccination record submitted
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name="medicalCertSubmitted"
                            defaultChecked={values.medicalCertSubmitted}
                            suppressHydrationWarning
                            className="h-4 w-4 rounded border-gray-300 accent-[#15664f]"
                        />
                        Medical certification submitted
                    </label>
                </div>

                <div className="mt-5">
                    <Field label="Medicine/s, dosage and schedule (if school nurse assistance is required)">
                        <textarea
                            name="medicines"
                            defaultValue={t.medicines ?? ""}
                            rows={3}
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
                </div>
            </Section>

            <Section title="Certification of Parent / Official Guardian">
                <p className="-mt-2 mb-4 text-xs leading-relaxed text-gray-600">
                    Kinukumpirma ng magulang o guardian na walang sintomas ang learner at nasa mabuting
                    kalagayan, at na totoo at tama ang lahat ng impormasyong ibinigay sa form na ito.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Signature over Printed Name of Parent / Guardian">
                        <input
                            name="certifiedBy"
                            defaultValue={t.certifiedBy ?? ""}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Date">
                        <input
                            name="declarationDate"
                            type="date"
                            defaultValue={t.declarationDate ?? ""}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                </div>
            </Section>

            <div className="flex justify-end gap-3">
                <Link
                    href={cancelHref}
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={pending}
                    suppressHydrationWarning
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    {pending ? "Saving..." : "Save Declaration"}
                </button>
            </div>
        </form>
    );
}