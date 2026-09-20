"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createDental, updateDental, type DentalState } from "./actions";

const initialState: DentalState = {};

const inputClass =
    "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

export type DentalValues = {
    dentalId?: number;
    studentNumber: string;
    visitDate: string;
    procedureName: string;
    tooth: string;
    dentistName: string;
    status: string;
    notes: string;
};

type Props = {
    mode: "create" | "edit";
    record: DentalValues;
    cancelHref: string;
};

export default function DentalForm({ mode, record, cancelHref }: Props) {
    const action = mode === "create" ? createDental : updateDental;
    const [state, formAction, pending] = useActionState(action, initialState);

    const { dentalId, ...rest } = record;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {mode === "edit" && <input type="hidden" name="dentalId" value={dentalId} />}

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Dental Visit</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {mode === "create" ? (
                        <Field label="Student Number *">
                            <input
                                name="studentNumber"
                                defaultValue={v.studentNumber}
                                placeholder="e.g. 2024-00123"
                                required
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    ) : (
                        <Field label="Student Number">
                            <input
                                value={v.studentNumber}
                                disabled
                                className={`${inputClass} bg-gray-100 text-gray-500`}
                            />
                        </Field>
                    )}

                    <Field label="Visit Date *">
                        <input
                            name="visitDate"
                            type="date"
                            defaultValue={v.visitDate}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Procedure *">
                        <input
                            name="procedureName"
                            defaultValue={v.procedureName}
                            placeholder="e.g. Tooth Extraction"
                            maxLength={150}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Tooth">
                        <input
                            name="tooth"
                            defaultValue={v.tooth}
                            placeholder="e.g. #16 or Full mouth"
                            maxLength={50}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Attending Dentist">
                        <input
                            name="dentistName"
                            defaultValue={v.dentistName}
                            placeholder="e.g. Dr. Ana Lim"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Status">
                        <select
                            name="status"
                            defaultValue={v.status}
                            suppressHydrationWarning
                            className={inputClass}
                        >
                            <option value="completed">Completed</option>
                            <option value="follow-up">Follow-up</option>
                        </select>
                    </Field>
                </div>

                <div className="mt-4">
                    <Field label="Notes">
                        <textarea
                            name="notes"
                            defaultValue={v.notes}
                            rows={4}
                            placeholder="Additional details about the procedure..."
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
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
                    {pending ? "Saving..." : mode === "create" ? "Save Record" : "Save Changes"}
                </button>
            </div>
        </form>
    );
}