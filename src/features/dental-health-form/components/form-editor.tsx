"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveDentalHealthForm, type DentalFormState } from "@/features/dental-health-form/actions";
import { LEGEND, OCCLUSION, PERIODONTAL, TREATMENT } from "@/features/dental-health-form/chart-data";
import ToothGrid, { type ChartMap } from "./tooth-grid";

const initialState: DentalFormState = {};

const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

export type DentalFormValues = {
    studentNumber: string;
    studentName: string;
    dateOfBirth: string;
    level: string;
    section: string;
    age: string;
    sex: string;
    chart: ChartMap;
    periodontal: Record<string, boolean>;
    occlusion: Record<string, boolean>;
    treatment: Record<string, boolean>;
    remarks: string;
    examDate: string;
    examinedBy: string;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

function CheckGroup({
    title,
    prefix,
    items,
    checked,
}: {
    title: string;
    prefix: string;
    items: { key: string; label: string }[];
    checked: Record<string, boolean>;
}) {
    return (
        <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</h3>
            <div className="mt-3 space-y-2">
                {items.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name={`${prefix}_${item.key}`}
                            defaultChecked={Boolean(checked[item.key])}
                            suppressHydrationWarning
                            className="h-4 w-4 rounded border-gray-300 accent-[#15664f]"
                        />
                        {item.label}
                    </label>
                ))}
            </div>
        </div>
    );
}

export default function DentalHealthFormEditor({
    values,
    cancelHref,
}: {
    values: DentalFormValues;
    cancelHref: string;
}) {
    const [state, formAction, pending] = useActionState(saveDentalHealthForm, initialState);

    return (
        <form action={formAction} className="space-y-6">
            <datalist id="dental-codes">
                {LEGEND.map((item) => (
                    <option key={item.code} value={item.code}>
                        {item.meaning}
                    </option>
                ))}
            </datalist>

            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <input type="hidden" name="studentNumber" value={values.studentNumber} />

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Student Information</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <Field label="Name">
                        <input
                            value={values.studentName}
                            readOnly
                            suppressHydrationWarning
                            className={`${inputClass} bg-gray-50`}
                        />
                    </Field>
                    <Field label="Date of Birth">
                        <input
                            value={values.dateOfBirth || "—"}
                            readOnly
                            suppressHydrationWarning
                            className={`${inputClass} bg-gray-50`}
                        />
                    </Field>
                    <Field label="Student Number">
                        <input
                            value={values.studentNumber}
                            readOnly
                            suppressHydrationWarning
                            className={`${inputClass} bg-gray-50`}
                        />
                    </Field>
                    <Field label="Level">
                        <input
                            name="level"
                            defaultValue={values.level}
                            placeholder="e.g. Grade 12"
                            maxLength={50}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Section">
                        <input
                            name="section"
                            defaultValue={values.section}
                            placeholder="e.g. St. Jude"
                            maxLength={50}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Age">
                            <input
                                name="age"
                                type="number"
                                min={1}
                                max={120}
                                defaultValue={values.age}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Sex">
                            <select
                                name="sex"
                                defaultValue={values.sex}
                                suppressHydrationWarning
                                className={inputClass}
                            >
                                <option value="">—</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </Field>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Dental Chart</h2>
                <p className="mt-1 text-xs text-gray-500">
                    Type a legend code in each box (e.g. C, AM, X). Leave blank if none.
                </p>
                <div className="mt-5">
                    <ToothGrid chart={values.chart} />
                </div>

                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">Legend</h3>
                    <div className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-gray-700 sm:grid-cols-2 lg:grid-cols-3">
                        {LEGEND.map((item) => (
                            <p key={item.code}>
                                <span className="font-bold text-gray-900">{item.code}</span> – {item.meaning}
                            </p>
                        ))}
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid gap-8 md:grid-cols-3">
                    <CheckGroup
                        title="Periodontal Condition"
                        prefix="perio"
                        items={PERIODONTAL}
                        checked={values.periodontal}
                    />
                    <CheckGroup
                        title="Occlusion"
                        prefix="occ"
                        items={OCCLUSION}
                        checked={values.occlusion}
                    />
                    <CheckGroup
                        title="Treatment Needed"
                        prefix="tx"
                        items={TREATMENT}
                        checked={values.treatment}
                    />
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Remarks &amp; Examination</h2>
                <div className="mt-4 space-y-4">
                    <Field label="Remarks">
                        <textarea
                            name="remarks"
                            defaultValue={values.remarks}
                            rows={4}
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Date of Examination">
                            <input
                                name="examDate"
                                type="date"
                                defaultValue={values.examDate}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Examined by">
                            <input
                                value={values.examinedBy}
                                readOnly
                                suppressHydrationWarning
                                className={`${inputClass} bg-gray-50`}
                            />

                        </Field>
                    </div>
                </div>
            </section>

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
                    {pending ? "Saving..." : "Save Dental Health Record"}
                </button>
            </div>
        </form>
    );
}