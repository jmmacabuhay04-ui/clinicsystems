"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ClipboardList, Save, UserRound, X } from "lucide-react";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import SuggestInput from "@/components/shared/suggest-input";
import { createDental, updateDental, type DentalState } from "@/features/dental-records/actions";
import DentalModel from "./dental-model";

const initialState: DentalState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const card = "rounded-xl border-2 border-[#cfe5d9] bg-white shadow-md shadow-[#15664f]/10";

// Mga karaniwang procedure. Puwede pa ring mag-type ng iba.
const COMMON_PROCEDURES = [
    "Oral prophylaxis (Cleaning)",
    "Tooth extraction",
    "Temporary filling",
    "Permanent filling",
    "Fluoride application",
    "Dental check-up",
    "Pit and fissure sealant",
    "Gum treatment",
];

// Kulay ng bawat status kapag napili
const STATUSES = [
    { value: "completed", label: "Completed", checked: "peer-checked:border-green-300 peer-checked:bg-green-100 peer-checked:text-green-700" },
    { value: "follow-up", label: "Follow-up", checked: "peer-checked:border-amber-300 peer-checked:bg-amber-100 peer-checked:text-amber-800" },
];

// Kulay ng Student / Employee kapag napili
const PATIENT_TYPES = [
    { type: "student", label: "Student", active: "bg-[#15664f] text-white" },
    { type: "employee", label: "Employee", active: "bg-amber-300 text-gray-900" },
] as const;

function ToothIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M7 3c-2.2 0-4 1.8-4 4.2 0 2 .8 3.3 1.5 4.6.6 1.2.9 2.6 1.1 4.2.3 2.4.8 5 2.4 5 1.3 0 1.6-1.8 2-3.6.3-1.4.8-2.4 2-2.4s1.7 1 2 2.4c.4 1.8.7 3.6 2 3.6 1.6 0 2.1-2.6 2.4-5 .2-1.6.5-3 1.1-4.2.7-1.3 1.5-2.6 1.5-4.6C21 4.8 19.2 3 17 3c-1.9 0-2.9 1-5 1S8.9 3 7 3z" />
        </svg>
    );
}

export type DentalValues = {
    dentalId?: number;
    patientType: "student" | "employee";
    patientNumber: string;
    visitDate: string;
    procedure: string;
    tooth: string;
    dentistName: string;
    status: string;
    notes: string;
};

export type PersonOption = { number: string; name: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
            {children}
        </label>
    );
}

// Header ng bawat card: icon + title + maikling paliwanag
function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef6f2] text-[#15664f]">
                {icon}
            </span>
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
    );
}

export default function DentalForm({
    mode,
    record,
    cancelHref,
    returnTo,
    students = [],
    employees = [],
}: {
    mode: "create" | "edit";
    record: DentalValues;
    cancelHref: string;
    /** Saan babalik pagkatapos mag-save (edit) */
    returnTo?: string;
    students?: PersonOption[];
    employees?: PersonOption[];
}) {
    const action = mode === "create" ? createDental : updateDental;
    const [state, formAction, pending] = useActionState(action, initialState);

    const v: Record<string, string> = {
        patientType: record.patientType,
        patientNumber: record.patientNumber,
        visitDate: record.visitDate,
        procedure: record.procedure,
        tooth: record.tooth,
        status: record.status,
        notes: record.notes,
        ...(state.values ?? {}),
    };

    const [patientType, setPatientType] = useState<"student" | "employee">(
        v.patientType === "employee" ? "employee" : "student",
    );
    const isEmployee = patientType === "employee";
    const people = isEmployee ? employees : students;
    const [notesLength, setNotesLength] = useState((v.notes ?? "").length);

    // The dentist is never submitted by this form, so it always comes from
    // the page, never from a failed submit. Keeping it out of `v` means a
    // rejected save can no longer blank it out on screen.
    const dentist = record.dentistName ?? "";
    const currentStatus = v.status || "completed";

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
            )}

            {mode === "edit" && <input type="hidden" name="dentalId" value={record.dentalId} />}
            {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
            <input type="hidden" name="patientType" value={patientType} />

            {/* Kaliwa: Patient + Procedure. Kanan: Dental Model (nakadikit habang nag-i-scroll) */}
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div className="min-w-0 space-y-6">
                    {/* Patient */}
                    <section className={`${card} min-w-0`}>
                        <SectionHeader
                            icon={<UserRound className="h-5 w-5" />}
                            title="Patient & Visit"
                            description="Who came in and when."
                        />
                        <div className="space-y-4 p-5 md:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-gray-800">Patient Type</span>
                                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                                    {PATIENT_TYPES.map((p) => (
                                        <button
                                            key={p.type}
                                            type="button"
                                            onClick={() => setPatientType(p.type)}
                                            className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${patientType === p.type ? p.active : "text-gray-700 hover:bg-gray-100"
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Field label={isEmployee ? "Employee *" : "Student *"}>
                                {people.length > 0 ? (
                                    <SuggestInput
                                        key={patientType}
                                        name="patientNumber"
                                        defaultValue={v.patientType === patientType ? v.patientNumber : ""}
                                        suggestions={people.map((p) => ({ value: p.number, label: p.name }))}
                                        placeholder={isEmployee ? "Search employee by name or number..." : "Search student by name or number..."}
                                        maxLength={20}
                                        required
                                        className={inputClass}
                                    />
                                ) : (
                                    <input
                                        key={patientType}
                                        name="patientNumber"
                                        defaultValue={v.patientType === patientType ? v.patientNumber : ""}
                                        placeholder={isEmployee ? "e.g. 2001-001" : "e.g. 2024-00123"}
                                        maxLength={20}
                                        required
                                        suppressHydrationWarning
                                        className={inputClass}
                                    />
                                )}
                            </Field>

                            <div className="grid gap-4 sm:grid-cols-2">
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
                                <label className="block space-y-1.5">
                                    <span className="text-sm font-semibold text-gray-800">Attending Dentist</span>
                                    <input
                                        value={dentist}
                                        readOnly
                                        placeholder="Not recorded"
                                        suppressHydrationWarning
                                        className={`${inputClass} bg-[#f6faf8] text-gray-700`}
                                    />
                                    <span className={`block text-xs ${dentist ? "text-gray-500" : "text-amber-700"}`}>
                                        {dentist
                                            ? mode === "create"
                                                ? "Automatic: the account currently logged in."
                                                : "Recorded when this entry was created."
                                            : "No dentist on record. Saving this form will not change it."}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Procedure */}
                    <section className={`${card} min-w-0`}>
                        <SectionHeader
                            icon={<ClipboardList className="h-5 w-5" />}
                            title="Procedure"
                            description="What was done, which tooth, and the status."
                        />
                        <div className="space-y-4 p-5 md:p-6">
                            <Field label="Procedure *">
                                <SuggestInput
                                    name="procedure"
                                    defaultValue={v.procedure}
                                    suggestions={COMMON_PROCEDURES.map((p) => ({ value: p }))}
                                    placeholder="Select or type a procedure..."
                                    maxLength={150}
                                    required
                                    className={inputClass}
                                />
                            </Field>

                            <Field label="Tooth">
                                <input
                                    name="tooth"
                                    defaultValue={v.tooth}
                                    placeholder="e.g. #16 or Full mouth (or pick on the model below)"
                                    maxLength={50}
                                    suppressHydrationWarning
                                    className={inputClass}
                                />
                            </Field>

                            <div className="space-y-1.5">
                                <span className="block text-sm font-semibold text-gray-800">Status</span>
                                <div className="grid grid-cols-2 gap-2">
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
                                                className={`flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-[#15664f]/30 ${s.checked}`}
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
                                    defaultValue={v.notes}
                                    onChange={(e) => setNotesLength(e.target.value.length)}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Additional details about the procedure..."
                                    suppressHydrationWarning
                                    className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 hover:border-[#15664f]/50 focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                                />
                                <span className="block text-right text-xs text-gray-400">{notesLength}/1000</span>
                            </Field>
                        </div>
                    </section>
                </div>

                {/* Dental model */}
                <section className={`${card} min-w-0 xl:sticky xl:top-6`}>
                    <SectionHeader
                        icon={<ToothIcon className="h-5 w-5" />}
                        title="Dental Model"
                        description="Click a tooth, then add it to the Tooth field. Teeth outlined in green are already listed there."
                    />
                    <div className="p-5 md:p-6">
                        <DentalModel initialValue={v.tooth} />
                    </div>
                </section>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link
                    href={cancelHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                    <X className="h-4 w-4" />
                    Cancel
                </Link>
                <ConfirmSubmit
                    title={mode === "create" ? "Save dental record" : "Save changes"}
                    message={
                        mode === "create"
                            ? `Save this new dental record for this ${patientType}?`
                            : "Save the changes to this dental record?"
                    }
                    confirmLabel="Save"
                    icon={<Save className="h-5 w-5" />}
                    disabled={pending}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#10523f] disabled:opacity-60"
                >
                    <Save className="h-4 w-4" />
                    {pending ? "Saving..." : mode === "create" ? "Save Record" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}