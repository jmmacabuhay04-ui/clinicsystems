"use client";

import { useActionState, useState } from "react";
import { Printer } from "lucide-react";
import { issueSlip, type SlipState } from "./actions";

const initialState: SlipState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const readonlyClass =
    "h-11 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-700";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-700">{label}</span>
            {children}
        </label>
    );
}

export type StudentOption = {
    student_number: string;
    last_name: string;
    first_name: string;
    program: string | null;
    grade_level: string | null;
};

type Props = {
    slipType: "teacher" | "gate";
    students: StudentOption[];
    today: string;
    timeNow: string;
};

export default function ReferralForm({ slipType, students, today, timeNow }: Props) {
    const [state, formAction, pending] = useActionState(issueSlip, initialState);
    const [query, setQuery] = useState("");

    const match = students.find(
        (s) =>
            s.student_number === query.trim() ||
            `${s.first_name} ${s.last_name}`.toLowerCase() === query.trim().toLowerCase()
    );

    const fullName = match ? `${match.first_name} ${match.last_name}` : "";
    const programYear = match ? [match.program, match.grade_level].filter(Boolean).join(" ") : "";

    return (
        <form action={formAction} className="space-y-5">
            {state.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </p>
            )}
            {state.success && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    {state.success}
                </p>
            )}

            <input type="hidden" name="slipType" value={slipType} />
            <input type="hidden" name="slipDate" value={today} />
            <input type="hidden" name="timeIssued" value={timeNow} />
            <input type="hidden" name="studentNumber" value={match?.student_number ?? ""} />

            <Field label="Student Search">
                <input
                    list="student-options"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type student name or number"
                    suppressHydrationWarning
                    className={inputClass}
                />
            </Field>

            <datalist id="student-options">
                {students.map((s) => (
                    <option key={s.student_number} value={s.student_number}>
                        {s.first_name} {s.last_name}
                    </option>
                ))}
            </datalist>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name">
                    <input value={fullName} readOnly className={readonlyClass} />
                </Field>
                <Field label="Student Number">
                    <input value={match?.student_number ?? ""} readOnly className={readonlyClass} />
                </Field>
                <Field label="Program/Year Level">
                    <input value={programYear} readOnly className={readonlyClass} />
                </Field>
                <Field label="Section">
                    <input name="section" placeholder="e.g. 2A" maxLength={50} className={inputClass} />
                </Field>
            </div>

            {slipType === "teacher" && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Teacher Name">
                        <input
                            name="teacherName"
                            placeholder="Enter teacher name"
                            maxLength={100}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Subject/Class">
                        <input
                            name="subject"
                            placeholder="Enter subject or class"
                            maxLength={100}
                            className={inputClass}
                        />
                    </Field>
                </div>
            )}

            <Field
                label={
                    slipType === "teacher" ? "Reason for referral / Student's complaint" : "Reason for gate pass"
                }
            >
                <textarea
                    name="reason"
                    rows={5}
                    maxLength={500}
                    placeholder={
                        slipType === "teacher"
                            ? "Describe the reason for clinic referral"
                            : "Describe why the student is being released"
                    }
                    required
                    suppressHydrationWarning
                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20"
                />
            </Field>

            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={pending || !match}
                    suppressHydrationWarning
                    className="h-11 flex-1 rounded-lg bg-[#15664f] px-4 font-semibold text-white hover:bg-[#10523f] disabled:opacity-60"
                >
                    {pending ? "Issuing..." : slipType === "teacher" ? "Issue Referral Slip" : "Issue Gate Pass"}
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <Printer className="h-4 w-4" />
                    Print Slip
                </button>
            </div>

            {!match && query && (
                <p className="text-xs text-amber-700">
                    Select a student from the list to enable issuing.
                </p>
            )}
        </form>
    );
}