"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

function SlipLine({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex gap-2">
            <span className="w-40 shrink-0 font-semibold">{label}</span>
            <span className="flex-1 border-b border-gray-400">{value || "\u00A0"}</span>
        </div>
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

function to12Hour(value: string) {
    const [h, m] = value.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

function longDate(value: string) {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}

export default function ReferralForm({ slipType, students, today, timeNow }: Props) {
    const [state, formAction, pending] = useActionState(issueSlip, initialState);
    const [query, setQuery] = useState("");
    const [section, setSection] = useState("");
    const [teacherName, setTeacherName] = useState("");
    const [subject, setSubject] = useState("");
    const [reason, setReason] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const match = students.find(
        (s) =>
            s.student_number === query.trim() ||
            `${s.first_name} ${s.last_name}`.toLowerCase() === query.trim().toLowerCase()
    );

    const fullName = match ? `${match.first_name} ${match.last_name}` : "";
    const programYear = match ? [match.program, match.grade_level].filter(Boolean).join(" ") : "";
    const slipTitle = slipType === "teacher" ? "REFERRAL SLIP" : "GATE PASS";

    return (
        <>
            {/* Printing rules: only the slip is printed, one page */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `@media print {
            @page { size: A4; margin: 15mm; }
            html, body { height: auto !important; background: #fff !important; }
            body > *:not(#printable-slip) { display: none !important; }
            #printable-slip { display: block !important; }
          }`,
                }}
            />

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
                        <input
                            name="section"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            placeholder="e.g. 2A"
                            maxLength={50}
                            className={inputClass}
                        />
                    </Field>
                </div>

                {slipType === "teacher" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Teacher Name">
                            <input
                                name="teacherName"
                                value={teacherName}
                                onChange={(e) => setTeacherName(e.target.value)}
                                placeholder="Enter teacher name"
                                maxLength={100}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Subject/Class">
                            <input
                                name="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
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
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
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
                        disabled={!match}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
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

            {/* Printed slip — hidden on screen, one page only */}
            {mounted &&
                createPortal(
                    <div id="printable-slip" className="hidden text-black">
                        <div className="text-center">
                            <img
                                src="/bcas.jpg"
                                alt="BCAS"
                                className="mx-auto h-20 w-20 rounded-full object-cover"
                            />
                            <p className="mt-2 text-lg font-bold uppercase">
                                Batangas College of Arts and Sciences
                            </p>
                            <p className="text-sm">School Clinic</p>
                            <p className="mt-4 text-xl font-bold tracking-wide underline">{slipTitle}</p>
                        </div>

                        <div className="mt-8 space-y-4 text-base">
                            <div className="flex gap-8">
                                <span className="flex-1">
                                    <span className="font-semibold">Date:</span> {longDate(today)}
                                </span>
                                <span className="flex-1">
                                    <span className="font-semibold">Time:</span> {to12Hour(timeNow)}
                                </span>
                            </div>

                            <SlipLine label="Student Name" value={fullName} />
                            <SlipLine label="Student Number" value={match?.student_number ?? ""} />
                            <SlipLine label="Program / Year Level" value={programYear} />
                            <SlipLine label="Section" value={section} />
                            {slipType === "teacher" && (
                                <>
                                    <SlipLine label="Teacher" value={teacherName} />
                                    <SlipLine label="Subject / Class" value={subject} />
                                </>
                            )}

                            <div>
                                <p className="font-semibold">
                                    {slipType === "teacher" ? "Reason for Referral" : "Reason for Gate Pass"}
                                </p>
                                <p className="mt-2 min-h-16 whitespace-pre-wrap border-b border-gray-400 pb-2">
                                    {reason}
                                </p>
                            </div>
                        </div>

                        <div className="mt-16 flex justify-between gap-10 text-center text-sm">
                            <div className="flex-1">
                                <p className="border-t border-gray-500 pt-2">
                                    {slipType === "teacher" ? "Teacher's Signature" : "Clinic Staff Signature"}
                                </p>
                            </div>
                            <div className="flex-1">
                                <p className="border-t border-gray-500 pt-2">
                                    {slipType === "teacher" ? "Clinic Staff Signature" : "Guard / Gate Signature"}
                                </p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}