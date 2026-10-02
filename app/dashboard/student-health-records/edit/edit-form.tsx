"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateHealthRecord, type EditState } from "./actions";
import ConfirmButton from "@/components/confirm-button";

const initialState: EditState = {};

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

export type RecordValues = {
    recordId: number;
    studentNumber: string;
    visitDate: string;
    complaint: string;
    actionTaken: string;
    attendingStaff: string;
    height: string;
    weight: string;
    heartRate: string;
    bloodPressure: string;
    temperature: string;
};

export default function EditForm({ record, cancelHref }: { record: RecordValues; cancelHref: string }) {
    const [state, formAction, pending] = useActionState(updateHealthRecord, initialState);
    const { recordId, studentNumber, ...rest } = record;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };
    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            <input type="hidden" name="recordId" value={record.recordId} />
            <input type="hidden" name="studentNumber" value={record.studentNumber} />

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Visit Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Visit Date *">
                        <input name="visitDate" type="date" defaultValue={v.visitDate} required suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Attending Staff">
                        <input name="attendingStaff" defaultValue={v.attendingStaff} maxLength={100} suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Complaint *">
                        <input name="complaint" defaultValue={v.complaint} maxLength={255} required suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Action Taken">
                        <input name="actionTaken" defaultValue={v.actionTaken} maxLength={255} suppressHydrationWarning className={inputClass} />
                    </Field>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Vital Signs</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Field label="Height (cm)">
                        <input name="height" type="number" step="0.1" defaultValue={v.height} suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Weight (kg)">
                        <input name="weight" type="number" step="0.1" defaultValue={v.weight} suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Heart Rate (bpm)">
                        <input name="heartRate" type="number" step="1" defaultValue={v.heartRate} suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Blood Pressure">
                        <input name="bloodPressure" defaultValue={v.bloodPressure} placeholder="110/70" suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Temperature (°C)">
                        <input name="temperature" type="number" step="0.1" defaultValue={v.temperature} suppressHydrationWarning className={inputClass} />
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
                <ConfirmButton
                    title="Save changes?"
                    message="Save your changes to this health record? The existing information will be replaced."
                    confirmLabel="Save"
                    disabled={pending}
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    Save Changes
                </ConfirmButton>
            </div>
        </form>
    );
}