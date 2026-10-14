"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addHealthRecord, type RecordState } from "./actions";
import { createEmployeeRecord } from "@/app/dashboard/employee-health-records/record-actions";


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

type PersonType = "student" | "employee";

type Props = {
    studentNumber: string;
    today: string;
    staffName: string;
    cancelHref: string;
    defaultType?: PersonType;
};

export default function RecordForm({
    studentNumber,
    today,
    staffName,
    cancelHref,
    defaultType = "student",
}: Props) {
    const [personType, setPersonType] = useState<PersonType>(defaultType);
    const isStudent = personType === "student";

    const [studentState, studentAction, studentPending] = useActionState(addHealthRecord, initialState);
    const [employeeState, employeeAction, employeePending] = useActionState(createEmployeeRecord, initialState);

    const state = isStudent ? studentState : employeeState;
    const formAction = isStudent ? studentAction : employeeAction;
    const pending = isStudent ? studentPending : employeePending;

    const v = (state.values ?? {}) as Record<string, string>;

    // Magkaiba ang pangalan ng field sa student at employee actions.
    const idName = isStudent ? "studentNumber" : "employeeNumber";
    const idValue = v.studentNumber ?? v.employeeNumber ?? studentNumber;
    const height = v.height ?? v.heightCm ?? "";
    const weight = v.weight ?? v.weightKg ?? "";

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Patient Details</h2>

                <div className="mt-4 space-y-4">
                    <div className="space-y-1.5">
                        <span className="text-sm font-medium text-gray-700">Patient</span>
                        <div className="flex">
                            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1">
                                {(["student", "employee"] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setPersonType(t)}
                                        className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${personType === t
                                            ? "bg-[#15664f] text-white"
                                            : "text-gray-700 hover:text-gray-900"
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Field label={isStudent ? "Student Number *" : "Employee Number *"}>
                            <input
                                key={idName}
                                name={idName}
                                defaultValue={idValue}
                                placeholder={isStudent ? "e.g. 2024-00123" : "e.g. 2001-001"}
                                required
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Date of Birth (optional)">
                            <input
                                name="dateOfBirth"
                                type="date"
                                defaultValue={v.dateOfBirth ?? ""}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Gender (optional)">
                            <select
                                name="gender"
                                defaultValue={v.gender ?? ""}
                                suppressHydrationWarning
                                className={inputClass}
                            >
                                <option value="">Keep current</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </Field>
                    </div>
                </div>

                <p className="mt-3 text-sm text-gray-700">
                    Leave date of birth and gender blank to keep the {isStudent ? "student" : "employee"}&apos;s
                    current details.
                </p>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Visit Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Visit Date *">
                        <input
                            name="visitDate"
                            type="date"
                            defaultValue={v.visitDate ?? today}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Attending Staff">
                        <input
                            name="attendingStaff"
                            defaultValue={v.attendingStaff ?? staffName}
                            placeholder="e.g. Dr. Reyes"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Complaint *">
                        <input
                            name="complaint"
                            defaultValue={v.complaint ?? ""}
                            placeholder="e.g. Headache"
                            maxLength={255}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Action Taken">
                        <input
                            name="actionTaken"
                            defaultValue={v.actionTaken ?? ""}
                            placeholder="e.g. Prescribed paracetamol"
                            maxLength={255}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Vital Signs</h2>
                <p className="mt-1 text-sm text-gray-700">All optional. Fill in only what was measured.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Field label="Height (cm)">
                        <input
                            key={`h-${personType}`}
                            name={isStudent ? "height" : "heightCm"}
                            type="number"
                            step="0.1"
                            defaultValue={height}
                            placeholder="165"
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Weight (kg)">
                        <input
                            key={`w-${personType}`}
                            name={isStudent ? "weight" : "weightKg"}
                            type="number"
                            step="0.1"
                            defaultValue={weight}
                            placeholder="54"
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Heart Rate (bpm)">
                        <input name="heartRate" type="number" step="1" defaultValue={v.heartRate ?? ""} placeholder="72" suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Blood Pressure">
                        <input name="bloodPressure" defaultValue={v.bloodPressure ?? ""} placeholder="110/70" suppressHydrationWarning className={inputClass} />
                    </Field>
                    <Field label="Temperature (°C)">
                        <input name="temperature" type="number" step="0.1" defaultValue={v.temperature ?? ""} placeholder="36.5" suppressHydrationWarning className={inputClass} />
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
                    {pending ? "Saving..." : "Save Record"}
                </button>
            </div>
        </form>
    );
}