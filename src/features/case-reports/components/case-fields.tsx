"use client";

import { useState } from "react";
import { ClipboardCheck, NotebookPen, UserRound } from "lucide-react";
import SuggestInput from "@/components/shared/suggest-input";

// Mga field ng Case Report. Iisang itsura para sa New at Edit Case Report
// (kapareho ng Edit Health Record: card na may icon, title, at maikling paliwanag).

export type PersonOption = { number: string; name: string };
export type PatientType = "student" | "employee";

export const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "min-w-0 rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

const COMMON_DIAGNOSES = [
    "Fever",
    "Headache",
    "Stomachache",
    "Cough and colds",
    "Dizziness",
    "Toothache",
    "Menstrual cramps",
    "Allergy",
    "Wound / Injury",
    "Asthma attack",
];

const COMMON_ACTIONS = [
    "Given paracetamol, advised rest",
    "Rested at the clinic",
    "First aid applied",
    "Sent home",
    "Referred to hospital",
    "Advised to see a doctor",
];

// Kulay ng bawat status kapag napili
const STATUSES = [
    {
        value: "pending",
        label: "Pending",
        hint: "Still being handled",
        checked: "peer-checked:border-amber-400 peer-checked:bg-amber-50 peer-checked:text-amber-800",
        dot: "bg-amber-500",
    },
    {
        value: "referred",
        label: "Referred",
        hint: "Sent to a doctor or hospital",
        checked: "peer-checked:border-red-400 peer-checked:bg-red-50 peer-checked:text-red-700",
        dot: "bg-red-500",
    },
    {
        value: "resolved",
        label: "Resolved",
        hint: "Case is closed",
        checked: "peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700",
        dot: "bg-green-500",
    },
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

function SectionHeader({
    icon,
    title,
    description,
    badge,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            {badge}
        </div>
    );
}

export type CaseDefaults = {
    patientNumber: string;
    reportDate: string;
    staffName: string;
    complaint: string;
    actionTaken: string;
    status: string;
    notes: string;
};

export default function CaseFields({
    patientType,
    onPatientTypeChange,
    numberDefault,
    defaults,
    badge,
    students,
    employees,
}: {
    patientType: PatientType;
    onPatientTypeChange: (t: PatientType) => void;
    numberDefault: string;
    defaults: CaseDefaults;
    /** Hal. "New case" o "Case 2026-019" */
    badge: string;
    students: PersonOption[];
    employees: PersonOption[];
}) {
    const isStudent = patientType === "student";
    const people = isStudent ? students : employees;
    const [notesLength, setNotesLength] = useState(defaults.notes.length);

    return (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* LEFT: patient + case details */}
            <div className="min-w-0 space-y-6">
                <section className={card}>
                    <SectionHeader
                        icon={<UserRound className="h-5 w-5" />}
                        title="Patient"
                        description="Who this case report is for."
                        badge={
                            <span className="shrink-0 rounded-full bg-[#eef6f2] px-3 py-1 text-xs font-semibold text-[#15664f]">
                                {badge}
                            </span>
                        }
                    />
                    <div className="space-y-4 p-5 md:p-6">
                        <div className="space-y-1.5">
                            <span className="block text-sm font-semibold text-gray-800">Patient Type</span>
                            <div className="grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:inline-grid">
                                {PATIENT_TYPES.map((p) => (
                                    <button
                                        key={p.type}
                                        type="button"
                                        onClick={() => onPatientTypeChange(p.type)}
                                        className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${patientType === p.type ? p.active : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Field label={isStudent ? "Student *" : "Employee *"}>
                            <SuggestInput
                                key={patientType}
                                name="patientNumber"
                                defaultValue={numberDefault}
                                suggestions={people.map((p) => ({ value: p.number, label: p.name }))}
                                placeholder={isStudent ? "Search student by name or number..." : "Search employee by name or number..."}
                                required
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </section>

                <section className={card}>
                    <SectionHeader
                        icon={<ClipboardCheck className="h-5 w-5" />}
                        title="Case Details"
                        description="What happened and what was done."
                    />
                    <div className="space-y-4 p-5 md:p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Report Date *">
                                <input
                                    name="reportDate"
                                    type="date"
                                    defaultValue={defaults.reportDate}
                                    required
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Attending Staff">
                                <input
                                    name="staffName"
                                    defaultValue={defaults.staffName}
                                    placeholder="e.g. Nurse Reyes"
                                    maxLength={100}
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>
                        </div>

                        <Field label="Diagnosis / Complaint *">
                            <SuggestInput
                                name="complaint"
                                defaultValue={defaults.complaint}
                                suggestions={COMMON_DIAGNOSES.map((d) => ({ value: d }))}
                                placeholder="Select or type a diagnosis..."
                                maxLength={255}
                                required
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Action Taken">
                            <SuggestInput
                                name="actionTaken"
                                defaultValue={defaults.actionTaken}
                                suggestions={COMMON_ACTIONS.map((a) => ({ value: a }))}
                                placeholder="Select or type the action taken..."
                                maxLength={255}
                                className={inputClass}
                            />
                        </Field>
                    </div>
                </section>
            </div>

            {/* RIGHT: status + notes */}
            <section className={`${card} flex flex-col`}>
                <SectionHeader
                    icon={<NotebookPen className="h-5 w-5" />}
                    title="Status & Notes"
                    description="Where the case stands right now."
                />
                <div className="flex flex-1 flex-col gap-5 p-5 md:p-6">
                    <div className="space-y-1.5">
                        <span className="block text-sm font-semibold text-gray-800">Status</span>
                        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                            {STATUSES.map((s) => (
                                <label key={s.value} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s.value}
                                        defaultChecked={(defaults.status || "pending") === s.value}
                                        className="peer sr-only"
                                    />
                                    <span
                                        className={`flex h-full flex-col rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-600 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#15664f]/30 ${s.checked}`}
                                    >
                                        <span className="flex items-center gap-2 text-sm font-semibold">
                                            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                                            {s.label}
                                        </span>
                                        <span className="mt-0.5 text-xs text-gray-500">{s.hint}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <label className="flex flex-1 flex-col space-y-1.5">
                        <span className="text-sm font-semibold text-gray-800">Notes</span>
                        <textarea
                            name="notes"
                            defaultValue={defaults.notes}
                            onChange={(e) => setNotesLength(e.target.value.length)}
                            rows={6}
                            maxLength={1000}
                            placeholder="Additional details about the case..."
                            suppressHydrationWarning
                            className="min-h-[9rem] w-full flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                        <span className="block text-right text-xs text-gray-400">{notesLength}/1000</span>
                    </label>
                </div>
            </section>
        </div>
    );
}