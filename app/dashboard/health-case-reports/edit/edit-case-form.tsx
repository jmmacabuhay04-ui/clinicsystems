"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateCaseReport, type EditCaseState } from "./actions";

const initialState: EditCaseState = {};

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
    cancelHref: string;
};

export default function EditCaseForm(props: Props) {
    const [state, formAction, pending] = useActionState(updateCaseReport, initialState);
    const v = state.values ?? {};

    // Keep the choice after a failed submit so the nurse does not lose it.
    const [patientType, setPatientType] = useState<"student" | "employee">(
        (v.patientType as "student" | "employee") ?? props.patientType
    );

    const isStudent = patientType === "student";

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <input type="hidden" name="caseId" value={props.caseId} />
            <input type="hidden" name="patientType" value={patientType} />

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Case Details</h2>
                    <span className="rounded-full bg-[#eef6f2] px-3 py-1 text-sm font-semibold text-[#15664f]">
                        Case {props.caseNumber}
                    </span>
                </div>

                <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">Patient</p>
                    <div className="mt-1.5 inline-flex rounded-lg border border-gray-300 bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setPatientType("student")}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${isStudent ? "bg-[#15664f] text-white" : "text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setPatientType("employee")}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${!isStudent ? "bg-[#15664f] text-white" : "text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            Employee
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label={isStudent ? "Student Number *" : "Employee Number *"}>
                        <input
                            name="patientNumber"
                            defaultValue={v.patientNumber ?? props.patientNumber}
                            placeholder={isStudent ? "e.g. 2024-00123" : "e.g. EMP-001"}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Date *">
                        <input
                            name="reportDate"
                            type="date"
                            defaultValue={v.reportDate ?? props.reportDate}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Complaint *">
                        <input
                            name="complaint"
                            defaultValue={v.complaint ?? props.complaint}
                            placeholder="e.g. Severe headache"
                            maxLength={255}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Attending Staff">
                        <input
                            name="staffName"
                            defaultValue={v.staffName ?? props.staffName}
                            placeholder="e.g. Dr. Reyes"
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Status">
                        <select
                            name="status"
                            defaultValue={v.status ?? props.status}
                            suppressHydrationWarning
                            className={inputClass}
                        >
                            <option value="pending">Pending</option>
                            <option value="referred">Referred</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </Field>
                </div>

                <div className="mt-4">
                    <Field label="Notes">
                        <textarea
                            name="notes"
                            defaultValue={v.notes ?? props.notes}
                            rows={4}
                            placeholder="Additional details about the case..."
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                        />
                    </Field>
                </div>
            </section>

            <div className="flex justify-end gap-3">
                <Link
                    href={props.cancelHref}
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
                    {pending ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}