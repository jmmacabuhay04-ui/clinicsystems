"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
    createEmployeeRecord,
    updateEmployeeRecord,
    type RecordState,
} from "./record-actions";

const initialState: RecordState = {};

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
    recordId?: number;
    employeeNumber: string;
    employeeName: string;
    visitDate: string;
    complaint: string;
    actionTaken: string;
    attendingStaff: string;
    heightCm: string;
    weightKg: string;
    heartRate: string;
    bloodPressure: string;
    temperature: string;
};

export default function RecordForm({
    mode,
    record,
    cancelHref,
}: {
    mode: "create" | "edit";
    record: RecordValues;
    cancelHref: string;
}) {
    const action = mode === "create" ? createEmployeeRecord : updateEmployeeRecord;
    const [state, formAction, pending] = useActionState(action, initialState);

    const { recordId, employeeName, ...rest } = record;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {mode === "edit" && <input type="hidden" name="recordId" value={recordId} />}
            <input type="hidden" name="employeeNumber" value={v.employeeNumber} />

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Visit Details</h2>
                <p className="mt-1 text-sm text-gray-600">
                    {employeeName} · {v.employeeNumber}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                    <Field label="Attending Staff">
                        <input
                            name="attendingStaff"
                            defaultValue={v.attendingStaff}
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Complaint *">
                        <input
                            name="complaint"
                            defaultValue={v.complaint}
                            maxLength={200}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Blood Pressure">
                        <input
                            name="bloodPressure"
                            defaultValue={v.bloodPressure}
                            placeholder="e.g. 120/80"
                            maxLength={20}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="mt-4">
                    <Field label="Action Taken">
                        <textarea
                            name="actionTaken"
                            defaultValue={v.actionTaken}
                            rows={4}
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Vital Signs</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <Field label="Height (cm)">
                        <input
                            name="heightCm"
                            type="number"
                            step="0.1"
                            defaultValue={v.heightCm}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Weight (kg)">
                        <input
                            name="weightKg"
                            type="number"
                            step="0.1"
                            defaultValue={v.weightKg}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Heart Rate (bpm)">
                        <input
                            name="heartRate"
                            type="number"
                            defaultValue={v.heartRate}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Temperature (°C)">
                        <input
                            name="temperature"
                            type="number"
                            step="0.1"
                            defaultValue={v.temperature}
                            suppressHydrationWarning
                            className={inputClass}
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