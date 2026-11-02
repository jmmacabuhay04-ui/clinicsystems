"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ClipboardList, Lock, Save, UserRound, X } from "lucide-react";
import ConfirmSubmit from "@/components/shared/confirm-submit";
import SuggestInput from "@/components/shared/suggest-input";
import { createDental, updateDental, type DentalState } from "@/features/dental-records/actions";
import ToothPicker from "./tooth-picker";

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
            <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h2>
                <p className="text-sm text-gray-600">{description}</p>
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

    // Sa Edit: naka-lock ang pasyente at ang uri (Student / Employee),
    // para hindi mailipat ang dental record sa ibang tao.
    const locked = mode === "edit";
    const [patientType, setPatientType] = useState<"student" | "employee">(
        (locked ? record.patientType : v.patientType) === "employee" ? "employee" : "student",
    );
    const isEmployee = patientType === "employee";
    const people = isEmployee ? employees : students;
    const lockedName = people.find((p) => p.number === record.patientNumber)?.name;
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

            {/* Patient & Visit | Procedure (ang Dental Model ay nasa dropdown ng Tooth) */}
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="contents">{/* Patient at Procedure: magkatabi */}
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
                                            disabled={locked}
                                            title={locked ? "The patient type of a saved record cannot be changed." : undefined}
                                            onClick={() => setPatientType(p.type)}
                                            className={`rounded-md px-5 py-2 text-sm font-semibold transition-colors ${patientType === p.type
                                                ? p.active
                                                : locked
                                                    ? "cursor-not-allowed text-gray-400"
                                                    : "text-gray-600 hover:bg-gray-100"
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Field label={locked ? (isEmployee ? "Employee" : "Student") : isEmployee ? "Employee *" : "Student *"}>
                                {locked ? (
                                    <>
                                        {/* Naka-lock: hindi mailipat ang record sa ibang pasyente */}
                                        <input type="hidden" name="patientNumber" value={record.patientNumber} />
                                        <div className="relative">
                                            <input
                                                value={lockedName ? `${record.patientNumber} · ${lockedName}` : record.patientNumber}
                                                readOnly
                                                aria-readonly="true"
                                                className={`${inputClass} cursor-not-allowed bg-gray-50 pr-11 text-gray-700`}
                                            />
                                            <Lock className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                        </div>
                                        <span className="block text-sm text-gray-600">
                                            The patient cannot be changed. To record for another patient, add a new dental record.
                                        </span>
                                    </>
                                ) : people.length > 0 ? (
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
                                        className={`${inputClass} bg-[#f6faf8] text-gray-600`}
                                    />
                                    <span className={`block text-sm ${dentist ? "text-gray-600" : "text-amber-700"}`}>
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
                                {/* Dropdown: lalabas ang Dental Model pagka-click */}
                                <ToothPicker defaultValue={v.tooth} maxLength={50} className={inputClass} />
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
                                <span className="block text-right text-sm text-gray-600">{notesLength}/1000</span>
                            </Field>
                        </div>
                    </section>
                </div>

            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link
                    href={cancelHref}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
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