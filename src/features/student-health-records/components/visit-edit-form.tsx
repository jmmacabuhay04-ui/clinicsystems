"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { HeartPulse, Lock, Save, UserRound, X } from "lucide-react";
import { updateHealthRecord, type EditState } from "@/features/student-health-records/edit-actions";
import { updateEmployeeRecord } from "@/features/employee-health-records/record-actions";
import SuggestInput from "@/components/shared/suggest-input";
import ConfirmSubmit from "@/components/shared/confirm-submit";

// Edit ng clinic visit: KAPAREHO ng Log Clinic Visit form (record-form.tsx),
// pero naka-lock ang pasyente at may "Save Changes".

const initialState: EditState = {};

const inputClass =
    "h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const cardClass = "rounded-xl border-2 border-[#cfe5d9] bg-white p-6 shadow-md shadow-[#15664f]/10 md:p-8";

const COMMON_REASONS = [
    "Fever",
    "Headache",
    "Stomachache",
    "Cough and colds",
    "Dizziness",
    "Toothache",
    "Menstrual cramps",
    "Allergy",
    "Wound / Injury",
    "Check-up",
];
const COMMON_ACTIONS = [
    "Given paracetamol, advised rest",
    "Rested at the clinic",
    "First aid applied",
    "Sent home",
    "Referred to hospital",
    "Advised to see a doctor",
];

const STATUSES = [
    { value: "pending", label: "Pending", dot: "bg-yellow-500", checked: "peer-checked:border-yellow-400 peer-checked:bg-yellow-100 peer-checked:text-yellow-800" },
    { value: "referred", label: "Referred", dot: "bg-red-500", checked: "peer-checked:border-red-300 peer-checked:bg-red-100 peer-checked:text-red-700" },
    { value: "resolved", label: "Resolved", dot: "bg-green-500", checked: "peer-checked:border-green-300 peer-checked:bg-green-100 peer-checked:text-green-700" },
];

const PATIENT_TYPES = [
    { type: "student", label: "Student", active: "bg-[#15664f] text-white" },
    { type: "employee", label: "Employee", active: "bg-amber-300 text-gray-900" },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

export type VisitEditValues = {
    recordId: number;
    kind: "student" | "employee";
    patientNumber: string;
    patientName: string;
    visitDate: string;
    visitTime: string;
    complaint: string;
    actionTaken: string;
    attendingStaff: string;
    height: string;
    weight: string;
    heartRate: string;
    bloodPressure: string;
    temperature: string;
    status: string;
    notes: string;
};

export default function VisitEditForm({ record, cancelHref }: { record: VisitEditValues; cancelHref: string }) {
    const isStudent = record.kind === "student";
    const [studentState, studentAction, studentPending] = useActionState(updateHealthRecord, initialState);
    const [employeeState, employeeAction, employeePending] = useActionState(updateEmployeeRecord, initialState);
    const state = isStudent ? studentState : employeeState;
    const formAction = isStudent ? studentAction : employeeAction;
    const pending = isStudent ? studentPending : employeePending;

    const sv = (state.values ?? {}) as Record<string, string>;
    const v: Record<string, string> = {
        visitDate: record.visitDate,
        visitTime: record.visitTime,
        complaint: record.complaint,
        actionTaken: record.actionTaken,
        attendingStaff: record.attendingStaff,
        heartRate: record.heartRate,
        bloodPressure: record.bloodPressure,
        temperature: record.temperature,
        status: record.status,
        notes: record.notes,
        ...sv,
    };
    // Magkaiba ang pangalan ng field ng taas/timbang sa student at employee actions
    const height = sv.height ?? sv.heightCm ?? record.height;
    const weight = sv.weight ?? sv.weightKg ?? record.weight;
    const [notesLength, setNotesLength] = useState((v.notes ?? "").length);

    return (
        <form action={formAction} className="space-y-5">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            <input type="hidden" name="recordId" value={record.recordId} />
            <input type="hidden" name={isStudent ? "studentNumber" : "employeeNumber"} value={record.patientNumber} />

            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                {/* KALIWA: pasyente + visit */}
                <section className={`${cardClass} space-y-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <UserRound className="h-6 w-6 text-[#15664f]" />
                            <h2 className="text-lg font-semibold text-gray-900">Patient &amp; Visit</h2>
                        </div>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            Edit visit
                        </span>
                    </div>

                    {/* Naka-lock: hindi mailipat ang visit sa ibang pasyente */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-800">Patient Type</span>
                        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                            {PATIENT_TYPES.map((p) => (
                                <span
                                    key={p.type}
                                    className={`rounded-md px-5 py-2 text-sm font-medium ${record.kind === p.type ? p.active : "cursor-not-allowed text-gray-400"
                                        }`}
                                >
                                    {p.label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <Field label={isStudent ? "Student" : "Employee"}>
                        <div className="relative">
                            <input
                                value={record.patientName ? `${record.patientNumber} · ${record.patientName}` : record.patientNumber}
                                readOnly
                                aria-readonly="true"
                                className={`${inputClass} cursor-not-allowed bg-gray-50 pr-11 text-gray-700`}
                            />
                            <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        </div>
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
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
                        <Field label="Visit Time">
                            <input
                                name="visitTime"
                                type="time"
                                defaultValue={v.visitTime}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field label="Attending Staff">
                        <input
                            name="attendingStaff"
                            defaultValue={v.attendingStaff}
                            placeholder="e.g. Nurse Reyes"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Reason for Visit *">
                        <SuggestInput
                            name="complaint"
                            defaultValue={v.complaint}
                            suggestions={COMMON_REASONS.map((r) => ({ value: r }))}
                            placeholder="Select or type a reason..."
                            maxLength={255}
                            required
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Action Taken">
                        <SuggestInput
                            name="actionTaken"
                            defaultValue={v.actionTaken}
                            suggestions={COMMON_ACTIONS.map((a) => ({ value: a }))}
                            placeholder="Select or type the action taken..."
                            maxLength={255}
                            className={inputClass}
                        />
                    </Field>
                </section>

                {/* KANAN: vital signs + status + notes + buttons */}
                <section className={`${cardClass} flex flex-col gap-6`}>
                    <div className="flex items-center gap-2">
                        <HeartPulse className="h-6 w-6 text-[#15664f]" />
                        <h2 className="text-lg font-semibold text-gray-900">Vital Signs</h2>
                        <span className="text-sm text-gray-600">(optional)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                        <Field label="Temperature (°C)">
                            <input name="temperature" type="number" step="0.1" defaultValue={v.temperature} placeholder="36.5" suppressHydrationWarning className={inputClass} />
                        </Field>
                        <Field label="Blood Pressure">
                            <input name="bloodPressure" defaultValue={v.bloodPressure} placeholder="110/70" suppressHydrationWarning className={inputClass} />
                        </Field>
                        <Field label="Heart Rate (bpm)">
                            <input name="heartRate" type="number" step="1" defaultValue={v.heartRate} placeholder="72" suppressHydrationWarning className={inputClass} />
                        </Field>
                        <Field label="Weight (kg)">
                            <input
                                name={isStudent ? "weight" : "weightKg"}
                                type="number"
                                step="0.1"
                                defaultValue={weight}
                                placeholder="54"
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Height (cm)">
                            <input
                                name={isStudent ? "height" : "heightCm"}
                                type="number"
                                step="0.1"
                                defaultValue={height}
                                placeholder="165"
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    {/* Status ng Health Case Report ng visit na ito (sabay na ina-update) */}
                    <div className="space-y-1.5">
                        <span className="block text-sm font-semibold text-gray-800">Status</span>
                        <div className="grid grid-cols-3 gap-2">
                            {STATUSES.map((s) => (
                                <label key={s.value} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s.value}
                                        defaultChecked={(v.status || "pending") === s.value}
                                        className="peer sr-only"
                                    />
                                    <span
                                        className={`flex h-12 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#15664f]/30 ${s.checked}`}
                                    >
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                                        {s.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Field label="Symptoms / Notes">
                        <textarea
                            name="notes"
                            defaultValue={v.notes}
                            onChange={(e) => setNotesLength(e.target.value.length)}
                            placeholder="e.g. Patient has mild fever (38°C) and sore throat."
                            maxLength={500}
                            rows={4}
                            suppressHydrationWarning
                            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                        <span className="block text-right text-sm text-gray-600">{notesLength}/500</span>
                    </Field>

                    <div className="mt-auto flex justify-end gap-3 pt-2">
                        <Link
                            href={cancelHref}
                            className="inline-flex h-12 items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Link>
                        <ConfirmSubmit
                            title="Save changes?"
                            message="Save your changes to this clinic visit? The status of its Health Case Report will be updated too."
                            confirmLabel="Save"
                            disabled={pending}
                            className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {pending ? "Saving..." : "Save Changes"}
                        </ConfirmSubmit>
                    </div>
                </section>
            </div>
        </form>
    );
}