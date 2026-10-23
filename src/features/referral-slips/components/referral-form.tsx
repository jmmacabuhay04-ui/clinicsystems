"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Printer, Search, Send, X } from "lucide-react";
import { issueSlip, type SlipState } from "@/features/referral-slips/actions";
import FlashMessage from "@/components/shared/flash-message";

const initialState: SlipState = {};

const inputClass =
    "h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#15664f] focus:ring-2 focus:ring-[#15664f]/20";

const readonlyClass =
    "h-11 w-full rounded-lg border border-[#cfe5d9] bg-[#f6faf8] px-3 text-sm font-medium text-gray-800";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-gray-800">{label}</span>
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
    const [selected, setSelected] = useState<StudentOption | null>(null);
    const [open, setOpen] = useState(false);
    const [submitKey, setSubmitKey] = useState(0);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => setMounted(true), []);

    // Isara ang dropdown kapag nag-click sa labas
    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const match = selected;

    const term = query.trim().toLowerCase();
    const results = students
        .filter(
            (s) =>
                !term ||
                s.student_number.toLowerCase().includes(term) ||
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(term) ||
                `${s.last_name} ${s.first_name}`.toLowerCase().includes(term)
        )
        .slice(0, 8);

    function pick(s: StudentOption) {
        setSelected(s);
        setQuery(`${s.first_name} ${s.last_name}`);
        setOpen(false);
    }

    function clearStudent() {
        setSelected(null);
        setQuery("");
    }

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

            <form
                action={(formData) => {
                    setSubmitKey((k) => k + 1);
                    formAction(formData);
                }}
                className="space-y-5"
            >
                {state.error && (
                    <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {state.error}
                    </p>
                )}
                {state.success && !state.error && <FlashMessage key={submitKey}>{state.success}</FlashMessage>}

                <input type="hidden" name="slipType" value={slipType} />
                <input type="hidden" name="slipDate" value={today} />
                <input type="hidden" name="timeIssued" value={timeNow} />
                <input type="hidden" name="studentNumber" value={match?.student_number ?? ""} />

                <div ref={boxRef} className="relative space-y-1.5">
                    <span className="block text-sm font-semibold text-gray-800">Student *</span>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setSelected(null);
                                setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder="Search student name or number..."
                            autoComplete="off"
                            suppressHydrationWarning
                            className={`${inputClass} pl-9 pr-9 ${selected ? "border-[#15664f] bg-[#eef6f2]" : ""}`}
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={clearStudent}
                                aria-label="Clear student"
                                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {open && !selected && (
                        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                            {results.length === 0 && (
                                <li className="px-3 py-3 text-center text-sm text-gray-500">No students found.</li>
                            )}
                            {results.map((s) => (
                                <li key={s.student_number}>
                                    <button
                                        type="button"
                                        onClick={() => pick(s)}
                                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#eef6f2]"
                                    >
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef6f2] text-xs font-bold text-[#15664f]">
                                            {`${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-gray-900">
                                                {s.first_name} {s.last_name}
                                            </span>
                                            <span className="block truncate text-xs text-gray-500">
                                                {s.student_number}
                                                {s.program || s.grade_level
                                                    ? ` · ${[s.program, s.grade_level].filter(Boolean).join(" ")}`
                                                    : ""}
                                            </span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {selected && (
                        <p className="inline-flex items-center gap-1 text-xs font-medium text-[#15664f]">
                            <Check className="h-3.5 w-3.5" /> Student selected
                        </p>
                    )}
                </div>

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
                        rows={4}
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
                    <span className="block text-right text-xs text-gray-400">{reason.length}/500</span>
                </Field>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={pending || !match}
                        suppressHydrationWarning
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#15664f] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10523f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                        {pending ? "Issuing..." : slipType === "teacher" ? "Issue Referral Slip" : "Issue Gate Pass"}
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={!match}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border-2 border-[#15664f] bg-white px-4 text-sm font-semibold text-[#15664f] hover:bg-[#eef6f2] disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white"
                    >
                        <Printer className="h-4 w-4" />
                        Print Slip
                    </button>
                </div>

                {!match && (
                    <p className="text-xs text-gray-500">Select a student from the list to enable issuing and printing.</p>
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