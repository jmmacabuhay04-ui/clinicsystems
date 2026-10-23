"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ClipboardCheck, Save, UserRound, X } from "lucide-react";
import { updateCaseReport, type EditCaseState } from "@/features/case-reports/edit-actions";
import ConfirmButton from "@/components/shared/confirm-button";
import SuggestInput from "@/components/shared/suggest-input";

const initialState: EditCaseState = {};

const inputClass =
    "h-12 w-full rounded-lg border border-gray-300 bg-white px-4 text-[15px] text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";
const cardClass = "rounded-xl border-2 border-[#cfe5d9] bg-white p-6 shadow-md shadow-[#15664f]/10 md:p-8";

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

// Mga karaniwang aksyon. Puwede pa ring mag-type ng iba.
const COMMON_ACTIONS = [
    "Given paracetamol, advised rest",
    "Rested at the clinic",
    "First aid applied",
    "Sent home",
    "Referred to hospital",
    "Advised to see a doctor",
];

// Kulay ng bawat status kapag napili.
const STATUSES = [
    { value: "pending", label: "Pending", checked: "peer-checked:border-yellow-400 peer-checked:bg-yellow-100 peer-checked:text-yellow-800" },
    { value: "referred", label: "Referred", checked: "peer-checked:border-red-300 peer-checked:bg-red-100 peer-checked:text-red-700" },
    { value: "resolved", label: "Resolved", checked: "peer-checked:border-green-300 peer-checked:bg-green-100 peer-checked:text-green-700" },
];

// Kulay ng Student / Employee kapag napili.
const PATIENT_TYPES = [
    { type: "student", label: "Student", active: "bg-[#15664f] text-white" },
    { type: "employee", label: "Employee", active: "bg-amber-300 text-gray-900" },
] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-[15px] font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

export type PersonOption = { number: string; name: string };

type Props = {
    caseId: number;
    caseNumber: string;
    patientType: "student" | "employee";
    patientNumber: string;
    complaint: string;
    reportDate: string;
    staffName: string;
    status: string;
    notes: string;
    actionTaken?: string;
    cancelHref: string;
    students?: PersonOption[];
    employees?: PersonOption[];
};

export default function EditCaseForm(props: Props) {
    const [state, formAction, pending] = useActionState(updateCaseReport, initialState);
    const v = state.values ?? {};

    // Keep the choice after a failed submit so the nurse does not lose it.
    const [patientType, setPatientType] = useState<"student" | "employee">(
        (v.patientType as "student" | "employee") ?? props.patientType,
    );
    const isStudent = patientType === "student";
    const people = (isStudent ? props.students : props.employees) ?? [];

    const currentStatus = v.status ?? props.status;
    const [notesLength, setNotesLength] = useState((v.notes ?? props.notes).length);

    // Kapag pinalitan ang uri, huwag dalhin ang number ng ibang uri.
    const numberDefault =
        patientType === props.patientType ? (v.patientNumber ?? props.patientNumber) : (v.patientNumber ?? "");

    return (
        <form action={formAction} className="space-y-5">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            <input type="hidden" name="caseId" value={props.caseId} />
            <input type="hidden" name="patientType" value={patientType} />

            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                {/* LEFT: patient + case */}
                <section className={`${cardClass} space-y-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <UserRound className="h-6 w-6 text-[#15664f]" />
                            <h2 className="text-lg font-semibold text-gray-900">Patient &amp; Case</h2>
                        </div>
                        <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-xs font-semibold text-[#15664f]">
                            Case {props.caseNumber}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[15px] font-semibold text-gray-800">Patient Type</span>
                        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                            {PATIENT_TYPES.map((p) => (
                                <button
                                    key={p.type}
                                    type="button"
                                    onClick={() => setPatientType(p.type)}
                                    className={`rounded-md px-5 py-2 text-[15px] font-medium transition-colors ${patientType === p.type ? p.active : "text-gray-700 hover:bg-gray-100"
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

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Report Date *">
                            <input
                                name="reportDate"
                                type="date"
                                defaultValue={v.reportDate ?? props.reportDate}
                                required
                                suppressHydrationWarning
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Attending Staff">
                            <input
                                name="staffName"
                                defaultValue={v.staffName ?? props.staffName}
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
                            defaultValue={v.complaint ?? props.complaint}
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
                            defaultValue={v.actionTaken ?? props.actionTaken ?? ""}
                            suggestions={COMMON_ACTIONS.map((a) => ({ value: a }))}
                            placeholder="Select or type the action taken..."
                            maxLength={255}
                            className={inputClass}
                        />
                    </Field>
                </section>

                {/* RIGHT: status + notes */}
                <section className={`${cardClass} flex flex-col gap-6`}>
                    <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-6 w-6 text-[#15664f]" />
                        <h2 className="text-lg font-semibold text-gray-900">Status &amp; Notes</h2>
                    </div>

                    <div className="space-y-1.5">
                        <span className="block text-[15px] font-semibold text-gray-800">Status</span>
                        <div className="grid grid-cols-3 gap-2">
                            {STATUSES.map((s) => (
                                <label key={s.value} className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s.value}
                                        defaultChecked={currentStatus === s.value}
                                        className="peer sr-only"
                                    />
                                    <span
                                        className={`flex h-12 items-center justify-center rounded-lg border border-gray-300 bg-white text-[15px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#15664f]/30 ${s.checked}`}
                                    >
                                        {s.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Field label="Notes">
                        <textarea
                            name="notes"
                            defaultValue={v.notes ?? props.notes}
                            onChange={(e) => setNotesLength(e.target.value.length)}
                            rows={8}
                            maxLength={1000}
                            placeholder="Additional details about the case..."
                            suppressHydrationWarning
                            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-[15px] text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                        <span className="block text-right text-xs text-gray-500">{notesLength}/1000</span>
                    </Field>

                    <div className="mt-auto flex justify-end gap-3 pt-2">
                        <Link
                            href={props.cancelHref}
                            className="inline-flex h-12 items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-[15px] font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Link>
                        <ConfirmButton
                            title="Save changes?"
                            message="Save your changes to this health case report? The existing information will be replaced."
                            confirmLabel="Save"
                            disabled={pending}
                            className="inline-flex h-12 items-center gap-2 rounded-lg bg-[#15664f] px-6 text-[15px] font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                        >
                            <Save className="h-4 w-4" />
                            {pending ? "Saving..." : "Save Changes"}
                        </ConfirmButton>
                    </div>
                </section>
            </div>
        </form>
    );
}