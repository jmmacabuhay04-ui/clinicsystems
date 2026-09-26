"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import ConfirmSubmit from "@/components/confirm-submit";
import { createDental, updateDental, type DentalState } from "./actions";

const initialState: DentalState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {children}
        </label>
    );
}

export default function DentalForm({
    mode,
    record,
    cancelHref,
}: {
    mode: "create" | "edit";
    record: DentalValues;
    cancelHref: string;
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
        v.patientType === "employee" ? "employee" : "student"
    );
    const isEmployee = patientType === "employee";

    // The dentist is never submitted by this form, so it always comes from
    // the page, never from a failed submit. Keeping it out of `v` means a
    // rejected save can no longer blank it out on screen.
    const dentist = record.dentistName ?? "";

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            {mode === "edit" && <input type="hidden" name="dentalId" value={record.dentalId} />}
            <input type="hidden" name="patientType" value={patientType} />

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Dental Visit</h2>

                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">Patient</p>
                    <div className="mt-2 inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1">
                        {(["student", "employee"] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setPatientType(type)}
                                suppressHydrationWarning
                                className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${patientType === type
                                    ? "bg-[#15664f] text-white shadow-sm"
                                    : "text-gray-700 hover:bg-white"
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label={isEmployee ? "Employee Number *" : "Student Number *"}>
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
                    </Field>
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
                            name="procedure"
                            defaultValue={v.procedure}
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
                            value={dentist}
                            readOnly
                            placeholder="Not recorded"
                            suppressHydrationWarning
                            className={`${inputClass} bg-gray-50 text-gray-700`}
                        />
                        <span
                            className={`text-xs ${dentist ? "text-gray-500" : "text-amber-700"}`}
                        >
                            {dentist
                                ? mode === "create"
                                    ? "Automatic — the account currently logged in."
                                    : "Recorded when this entry was created."
                                : "No dentist on record. Saving this form will not change it."}
                        </span>
                    </Field>
                    <Field label="Status">
                        <select
                            name="status"
                            defaultValue={v.status || "completed"}
                            suppressHydrationWarning
                            className={inputClass}
                        >
                            <option value="completed">Completed</option>
                            <option value="follow-up">Follow-up</option>
                        </select>
                    </Field>
                    <div className="md:col-span-2">
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
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <Link
                    href={cancelHref}
                    className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
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
                    className="h-10 rounded-lg bg-[#15664f] px-5 text-sm font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    {pending ? "Saving..." : mode === "create" ? "Save Record" : "Save Changes"}
                </ConfirmSubmit>
            </div>
        </form>
    );
}