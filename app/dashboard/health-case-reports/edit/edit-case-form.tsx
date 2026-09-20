"use client";

import Link from "next/link";
import { useActionState } from "react";
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

export type CaseValues = {
    caseId: number;
    complaint: string;
    reportDate: string;
    staffName: string;
    status: string;
    notes: string;
};

export default function EditCaseForm({
    caseReport,
    cancelHref,
}: {
    caseReport: CaseValues;
    cancelHref: string;
}) {
    const [state, formAction, pending] = useActionState(updateCaseReport, initialState);

    const { caseId, ...rest } = caseReport;
    const v: Record<string, string> = { ...rest, ...(state.values ?? {}) };

    return (
        <form action={formAction} className="space-y-6">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}

            <input type="hidden" name="caseId" value={caseId} />

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Case Details</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Date *">
                        <input
                            name="reportDate"
                            type="date"
                            defaultValue={v.reportDate}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Attending Staff">
                        <input
                            name="staffName"
                            defaultValue={v.staffName}
                            maxLength={100}
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Complaint *">
                        <input
                            name="complaint"
                            defaultValue={v.complaint}
                            maxLength={255}
                            required
                            suppressHydrationWarning
                            className={inputClass}
                        />
                    </Field>

                    <Field label="Status">
                        <select
                            name="status"
                            defaultValue={v.status}
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
                            defaultValue={v.notes}
                            rows={4}
                            suppressHydrationWarning
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
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
                    {pending ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}