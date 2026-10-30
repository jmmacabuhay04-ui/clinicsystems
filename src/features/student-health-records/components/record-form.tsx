"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { HeartPulse, Save, UserRound, X } from "lucide-react";
import { addHealthRecord, type RecordState } from "@/features/student-health-records/new-actions";
import { createEmployeeRecord } from "@/features/employee-health-records/record-actions";
import SuggestInput from "@/components/shared/suggest-input";
import ConfirmSubmit from "@/components/shared/confirm-submit";

const initialState: RecordState = {};

// Kapareho ng New Case Report form
const inputClass =
    "h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const cardClass = "rounded-xl border-2 border-[#cfe5d9] bg-white p-6 shadow-md shadow-[#15664f]/10 md:p-8";

// Mga karaniwang dahilan at aksyon. Puwede pa ring mag-type ng iba.
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

// Status ng case report na kusang nagagawa sa bawat clinic visit
const STATUSES = [
    { value: "pending", label: "Pending", dot: "bg-yellow-500", checked: "peer-checked:border-yellow-400 peer-checked:bg-yellow-100 peer-checked:text-yellow-800" },
    { value: "referred", label: "Referred", dot: "bg-red-500", checked: "peer-checked:border-red-300 peer-checked:bg-red-100 peer-checked:text-red-700" },
    { value: "resolved", label: "Resolved", dot: "bg-green-500", checked: "peer-checked:border-green-300 peer-checked:bg-green-100 peer-checked:text-green-700" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

export type PersonType = "student" | "employee";

// Bawat uri ay may sariling page, para tama ang naka-highlight sa sidebar.
// Kulay kapag napili: Student = green, Employee = dilaw (kapareho ng case report)
const PATIENT_TYPES = [
    { type: "student", label: "Student", href: "/dashboard/student-health-records/new", active: "bg-[#15664f] text-white" },
    { type: "employee", label: "Employee", href: "/dashboard/employee-health-records/new", active: "bg-amber-300 text-gray-900" },
] as const;

export type PersonOption = { number: string; name: string };

type Props = {
    studentNumber: string;
    today: string;
    nowTime?: string;
    staffName: string;
    cancelHref: string;
    students?: PersonOption[];
    employees?: PersonOption[];
    defaultType?: PersonType;
};

export default function RecordForm({
    studentNumber,
    today,
    nowTime = "",
    staffName,
    cancelHref,
    students = [],
    employees = [],
    defaultType = "student",
}: Props) {
    // Ang Student/Employee toggle ay lumilipat ng page, kaya galing sa page ang uri.
    const personType: PersonType = defaultType;
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
    const people = isStudent ? students : employees;
    const [notesLength, setNotesLength] = useState((v.notes ?? "").length);

    // Kapag walang oras na naipasa ang page, kunin ang kasalukuyang oras (Manila) dito mismo,
    // para laging may laman ang Visit Time gaya ng Report Time sa case report.
    const timeRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const el = timeRef.current;
        if (!el || el.value) return;
        el.value = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Manila",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }).format(new Date());
    }, []);

    return (
        <form action={formAction} className="space-y-5">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                {/* LEFT: patient + visit */}
                <section className={`${cardClass} space-y-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <UserRound className="h-6 w-6 text-[#15664f]" />
                            <h2 className="text-lg font-semibold text-gray-900">Patient &amp; Visit</h2>
                        </div>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                            New visit
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-800">Patient Type</span>
                        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                            {PATIENT_TYPES.map((p) => (
                                <Link
                                    key={p.type}
                                    href={p.href}
                                    replace
                                    aria-current={personType === p.type ? "page" : undefined}
                                    className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${personType === p.type ? p.active : "text-gray-600 hover:bg-gray-100"
                                        }`}
                                >
                                    {p.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <Field label={isStudent ? "Student *" : "Employee *"}>
                        <SuggestInput
                            key={idName}
                            name={idName}
                            defaultValue={idValue}
                            suggestions={people.map((p) => ({ value: p.number, label: p.name }))}
                            placeholder={isStudent ? "Search student by name or number..." : "Search employee by name or number..."}
                            required
                            className={inputClass}
                        />
                    </Field>

                    <div className="grid gap-5 sm:grid-cols-2">
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
                        <Field label="Visit Time">
                            <input
                                ref={timeRef}
                                name="visitTime"
                                type="time"
                                defaultValue={v.visitTime ?? nowTime}
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <Field label="Attending Staff">
                        <input
                            name="attendingStaff"
                            defaultValue={v.attendingStaff ?? staffName}
                            placeholder="e.g. Nurse Reyes"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Reason for Visit *">
                        <SuggestInput
                            name="complaint"
                            defaultValue={v.complaint ?? ""}
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
                            defaultValue={v.actionTaken ?? ""}
                            suggestions={COMMON_ACTIONS.map((a) => ({ value: a }))}
                            placeholder="Select or type the action taken..."
                            maxLength={255}
                            className={inputClass}
                        />
                    </Field>
                </section>

                {/* RIGHT: vital signs + status + notes + buttons */}
                <section className={`${cardClass} flex flex-col gap-6`}>
                    <div className="flex items-center gap-2">
                        <HeartPulse className="h-6 w-6 text-[#15664f]" />
                        <h2 className="text-lg font-semibold text-gray-900">Vital Signs</h2>
                        <span className="text-sm text-gray-600">(optional)</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                        <Field label="Temperature (°C)">
                            <input name="temperature" type="number" step="0.1" defaultValue={v.temperature ?? ""} placeholder="36.5" suppressHydrationWarning className={inputClass} />
                        </Field>
                        <Field label="Blood Pressure">
                            <input name="bloodPressure" defaultValue={v.bloodPressure ?? ""} placeholder="110/70" suppressHydrationWarning className={inputClass} />
                        </Field>
                        <Field label="Heart Rate (bpm)">
                            <input name="heartRate" type="number" step="1" defaultValue={v.heartRate ?? ""} placeholder="72" suppressHydrationWarning className={inputClass} />
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
                    </div>

                    {/* Status ng awtomatikong Health Case Report ng visit na ito */}
                    <div className="space-y-1.5">
                        <span className="block text-sm font-semibold text-gray-800">Status</span>
                        <div className="grid grid-cols-3 gap-2">
                            {STATUSES.map((s) => (
                                <label key={s.value} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s.value}
                                        defaultChecked={(v.status ?? "pending") === s.value}
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
                            defaultValue={v.notes ?? ""}
                            onChange={(e) => setNotesLength(e.target.value.length)}
                            placeholder="e.g. Patient has mild fever (38°C) and sore throat."
                            maxLength={500}
                            rows={4}
                            suppressHydrationWarning
                            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                        <span className="block text-right text-sm text-gray-600">{notesLength}/500</span>
                    </Field>

                    {/* Mga button sa loob ng card, sa ibaba (kapareho ng case report) */}
                    <div className="mt-auto flex justify-end gap-3 pt-2">
                        <Link
                            href={cancelHref}
                            className="inline-flex h-12 items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Link>
                        <ConfirmSubmit
                            title="Save this clinic visit?"
                            message={`Please make sure the ${isStudent ? "student" : "employee"}, reason for visit, and vital signs are correct. A Health Case Report with the selected status will also be created for this visit.`}
                            confirmLabel="Save Visit"
                            disabled={pending}
                            className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {pending ? "Saving..." : "Save Visit"}
                        </ConfirmSubmit>
                    </div>
                </section>
            </div>
        </form>
    );
}